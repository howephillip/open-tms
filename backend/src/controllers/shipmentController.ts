import { Response } from 'express';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest';
import mongoose from 'mongoose';
import { Shipment, IShipment } from '../models/Shipment';
import { User } from '../models/User';
import { ApplicationSettings, IQuoteFormSettings, IShipmentFormSettings } from '../models/ApplicationSettings';
import { AIEmailService } from '../services/ai/emailService';
import { logger } from '../utils/logger';
import { LaneRateService } from '../services/laneRateService';
import { LaneRate } from '../models/LaneRate';

let aiEmailServiceInstance: AIEmailService | null = null;
const laneRateService = new LaneRateService();

function getAIEmailService(): AIEmailService {
  if (!aiEmailServiceInstance) {
    logger.info('Instantiating AIEmailService for the first time...');
    try {
        aiEmailServiceInstance = new AIEmailService();
    } catch (error: any) {
        logger.error('Failed to instantiate AIEmailService:', { message: error.message, stack: error.stack });
        throw new Error('AIEmailService could not be initialized.');
    }
  }
  return aiEmailServiceInstance;
}

const parseSortQuery = (sortQueryString?: string): Record<string, 1 | -1> => {
    if (!sortQueryString) return { createdAt: -1 };
    const sortOptions: Record<string, 1 | -1> = {};
    sortQueryString.split(',').forEach(part => {
        const trimmedPart = part.trim();
        if (trimmedPart.startsWith('-')) {
            sortOptions[trimmedPart.substring(1)] = -1;
        } else {
            sortOptions[trimmedPart] = 1;
        }
    });
    return Object.keys(sortOptions).length > 0 ? sortOptions : { createdAt: -1 }; 
};

const defaultQuoteFormSettings: IQuoteFormSettings = {
    requiredFields: [
        'shipper', 'modeOfTransport', 'equipmentType', 'origin.city', 'origin.state', 
        'destination.city', 'destination.state', 'scheduledPickupDate', 
        'commodityDescription', 'customerRate'
    ],
    quoteNumberPrefix: 'QT-',
    quoteNumberNextSequence: 1001,
};

const defaultShipmentFormSettings: IShipmentFormSettings = {
    requiredFields: [
        'shipper', 'carrier', 'modeOfTransport', 'status', 'equipmentType', 'commodityDescription',
        'customerRate', 'carrierCostTotal', 'scheduledPickupDate', 'scheduledDeliveryDate',
        'origin.address', 'destination.address'
    ],
};

const getFieldValue = (payload: any, fieldId: string): any => {
  if (!fieldId.includes('.')) {
      return payload[fieldId];
  }
  const parts = fieldId.split('.');
  let value = payload;
  for (const part of parts) {
      if (value && typeof value === 'object' && value.hasOwnProperty(part)) {
          value = value[part];
      } else {
          return undefined;
      }
  }
  return value;
};

// --- NEW HELPER FUNCTION ---
function calculateFinancials(data: Partial<IShipment>): Partial<IShipment> {
    const lineHaulCustomer = parseFloat(String(data.customerRate)) || 0;
    const lineHaulCarrier = parseFloat(String(data.carrierCostTotal)) || 0;
    const fscCustomerAmount = parseFloat(String(data.fscCustomerAmount)) || 0;
    const fscCarrierAmount = parseFloat(String(data.fscCarrierAmount)) || 0;
    const chassisCustomerCost = parseFloat(String(data.chassisCustomerCost)) || 0;
    const chassisCarrierCost = parseFloat(String(data.chassisCarrierCost)) || 0;

    let fscCustomerValue = 0;
    if (data.fscType === 'percentage' && fscCustomerAmount) { fscCustomerValue = lineHaulCustomer * (fscCustomerAmount / 100); }
    else if (data.fscType === 'fixed' && fscCustomerAmount) { fscCustomerValue = fscCustomerAmount; }

    let fscCarrierValue = 0;
    if (data.fscType === 'percentage' && fscCarrierAmount) { fscCarrierValue = lineHaulCarrier * (fscCarrierAmount / 100); }
    else if (data.fscType === 'fixed' && fscCarrierAmount) { fscCarrierValue = fscCarrierAmount; }

    let totalAccessorialsCustomerCost = 0;
    let totalAccessorialsCarrierCost = 0;
    if (Array.isArray(data.accessorials)) {
        data.accessorials.forEach((acc: any) => {
            totalAccessorialsCustomerCost += (parseFloat(String(acc.customerRate)) || 0) * (parseFloat(String(acc.quantity)) || 1);
            totalAccessorialsCarrierCost += (parseFloat(String(acc.carrierCost)) || 0) * (parseFloat(String(acc.quantity)) || 1);
        });
    }
    
    const totalCustomerRate = lineHaulCustomer + fscCustomerValue + chassisCustomerCost + totalAccessorialsCustomerCost;
    const totalCarrierCost = lineHaulCarrier + fscCarrierValue + chassisCarrierCost + totalAccessorialsCarrierCost;
    const grossProfit = totalCustomerRate - totalCarrierCost;
    const margin = totalCustomerRate > 0 ? (grossProfit / totalCustomerRate) * 100 : 0;

    return { totalCustomerRate, totalCarrierCost, grossProfit, margin };
}

export class ShipmentController {
  async createShipment(req: AuthenticatedRequest, res: Response): Promise<void> {
    logger.info('--- ENTERING createShipment ---');
    try {
      const flatData = req.body;
      const isQuote = flatData.status === 'quote';
      
      const shipmentData: Partial<IShipment> = {
        ...flatData,
        origin: {
          name: flatData.originName, address: flatData.originAddress, city: flatData.originCity,
          state: flatData.originState, zip: flatData.originZip, country: flatData.originCountry,
          locationType: flatData.originLocationType, contactName: flatData.originContactName,
          contactPhone: flatData.originContactPhone, contactEmail: flatData.originContactEmail, notes: flatData.originNotes,
        },
        destination: {
          name: flatData.destinationName, address: flatData.destinationAddress, city: flatData.destinationCity,
          state: flatData.destinationState, zip: flatData.destinationZip, country: flatData.destinationCountry,
          locationType: flatData.destinationLocationType, contactName: flatData.destinationContactName,
          contactPhone: flatData.destinationContactPhone, contactEmail: flatData.destinationContactEmail, notes: flatData.destinationNotes,
        },
        transloadFacility: flatData.isTransload ? {
            name: flatData.transloadFacilityName, address: flatData.transloadFacilityAddress,
            city: flatData.transloadFacilityCity, state: flatData.transloadFacilityState,
            zip: flatData.transloadFacilityZip,
        } : undefined,
      };
      
      const fieldsToRemove = [
        'originName', 'originAddress', 'originCity', 'originState', 'originZip', 'originCountry', 'originLocationType', 'originContactName', 'originContactPhone', 'originContactEmail', 'originNotes',
        'destinationName', 'destinationAddress', 'destinationCity', 'destinationState', 'destinationZip', 'destinationCountry', 'destinationLocationType', 'destinationContactName', 'destinationContactPhone', 'destinationContactEmail', 'destinationNotes',
        'transloadFacilityName', 'transloadFacilityAddress', 'transloadFacilityCity', 'transloadFacilityState', 'transloadFacilityZip'
      ];
      fieldsToRemove.forEach(field => delete (shipmentData as any)[field]);

      let requiredFields: string[] = [];
      if (isQuote) {
        const settingsDoc = await ApplicationSettings.findOne({ key: 'quoteForm' }).lean();
        requiredFields = (settingsDoc?.settings as IQuoteFormSettings)?.requiredFields || defaultQuoteFormSettings.requiredFields;
      } else {
        const settingsDoc = await ApplicationSettings.findOne({ key: 'shipmentForm' }).lean();
        requiredFields = (settingsDoc?.settings as IShipmentFormSettings)?.requiredFields || defaultShipmentFormSettings.requiredFields;
      }

      const missingFields: string[] = [];
      requiredFields.forEach(fieldId => {
        const value = getFieldValue(shipmentData, fieldId);
        if (fieldId === 'carrier' && isQuote && !value) { return; }
        if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
          missingFields.push(fieldId);
        }
      });
      
      if (missingFields.length > 0) {
        res.status(400).json({ success: false, message: `Missing required fields: ${[...new Set(missingFields)].join(', ')}.` });
        return;
      }

      if (!req.user?._id) {
        const defaultUser = await User.findOne({ email: 'admin@example.com' }).select('_id').lean();
        if (defaultUser) { shipmentData.createdBy = defaultUser._id; } 
        else {
          res.status(500).json({ success: false, message: 'System configuration error: Default user not found.' });
          return;
        }
      } else {
        shipmentData.createdBy = req.user._id;
      }
      
      // Calculate financials before saving
      const financials = calculateFinancials(shipmentData);
      Object.assign(shipmentData, financials);

      const shipment = new Shipment(shipmentData);
      await shipment.save();
      logger.info('Shipment saved successfully', { shipmentId: shipment._id });

      laneRateService.recordLaneRateFromShipment(shipment.toObject()).catch(err => {
        logger.error(`Failed to record lane rate in background for new shipment ${shipment.shipmentNumber}`, { error: err.message });
      });
      
      const populatedShipment = await shipment.populate([
            { path: 'shipper', select: 'name' }, { path: 'carrier', select: 'name' },
            { path: 'createdBy', select: 'firstName lastName email'},
            { path: 'documents', select: 'originalName _id mimetype size createdAt path'},
            { path: 'accessorials.accessorialTypeId', select: 'name code unitName' }
      ]);
      res.status(201).json({ success: true, data: populatedShipment.toObject(), message: 'Shipment created successfully' });

    } catch (error: any) {
      logger.error('CRITICAL ERROR in createShipment:', { message: error.message, stack: error.stack });
      if (error.name === 'ValidationError') {
        res.status(400).json({ success: false, message: error.message, errors: error.errors });
      } else if (error.code === 11000) {
        res.status(409).json({ success: false, message: `Duplicate key error. Field: ${JSON.stringify(error.keyValue)}` });
      } else {
        res.status(500).json({ success: false, message: 'Error creating shipment' });
      }
    }
  }

  async getShipments(req: AuthenticatedRequest, res: Response): Promise<void> {
    logger.info('Attempting to get shipments. Query params:', req.query);
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const sortOptions = parseSortQuery(req.query.sort as string | undefined);
      
      const { status, statusesNotIn, searchTerm, ...otherFilters } = req.query;
      const matchConditions: any[] = [];

      if (status) {
        matchConditions.push({ status: status as string });
      } else if (statusesNotIn) {
        const notInArray = Array.isArray(statusesNotIn) ? statusesNotIn : (statusesNotIn as string).split(',');
        matchConditions.push({ status: { $nin: notInArray } });
      }
      
      Object.keys(otherFilters).forEach(key => {
        if (['page', 'limit', 'sort'].includes(key)) return;
        const value = otherFilters[key];
        if (['shipper', 'carrier'].includes(key) && mongoose.Types.ObjectId.isValid(value as string)) {
          matchConditions.push({ [key]: new mongoose.Types.ObjectId(value as string) });
        } else if (key === 'startDate' || key === 'endDate') {
            let dateCondition = matchConditions.find(c => c.scheduledPickupDate);
            if (!dateCondition) {
                dateCondition = { scheduledPickupDate: {} };
                matchConditions.push(dateCondition);
            }
            if (key === 'startDate') dateCondition.scheduledPickupDate.$gte = new Date(value as string);
            if (key === 'endDate') dateCondition.scheduledPickupDate.$lte = new Date(value as string);
        } else if (typeof value === 'string') {
          matchConditions.push({ [key]: { $regex: value, $options: 'i' } });
        }
      });
      
      const finalQuery = matchConditions.length > 0 ? { $and: matchConditions } : {};
      
      let shipments: IShipment[];
      let total: number;

      if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim() !== '') {
        const searchStr = searchTerm.trim();
        const searchRegex = { $regex: searchStr, $options: 'i' };
        
        const textSearchOrConditions: any[] = [
            { shipmentNumber: searchRegex }, { billOfLadingNumber: searchRegex }, 
            { proNumber: searchRegex }, { containerNumber: searchRegex },
            { 'origin.city': searchRegex }, { 'origin.state': searchRegex },
            { 'destination.city': searchRegex }, { 'destination.state': searchRegex },
            { commodityDescription: searchRegex }, { quoteNotes: searchRegex }, { internalNotes: searchRegex }
        ];

        const basePipeline: mongoose.PipelineStage[] = [
          { $match: finalQuery },
          { $lookup: { from: 'shippers', localField: 'shipper', foreignField: '_id', as: 'shipperDoc' }},
          { $unwind: { path: '$shipperDoc', preserveNullAndEmptyArrays: true } },
          { $lookup: { from: 'carriers', localField: 'carrier', foreignField: '_id', as: 'carrierDoc' }},
          { $unwind: { path: '$carrierDoc', preserveNullAndEmptyArrays: true } },
        ];
        
        const searchMatchStage: mongoose.PipelineStage.Match = {
          $match: { $or: [ ...textSearchOrConditions, { 'shipperDoc.name': searchRegex }, { 'carrierDoc.name': searchRegex } ]}
        };

        const dataPipeline: mongoose.PipelineStage[] = [ ...basePipeline, searchMatchStage, { $sort: sortOptions }, { $skip: (page - 1) * limit }, { $limit: limit } ];
        const countPipeline: mongoose.PipelineStage[] = [ ...basePipeline, searchMatchStage, { $count: 'total' } ];
        
        shipments = await Shipment.aggregate(dataPipeline);
        const countResult = await Shipment.aggregate(countPipeline);
        total = countResult.length > 0 ? countResult[0].total : 0;
      } else {
        shipments = await Shipment.find(finalQuery)
            .populate({ path: 'shipper', select: 'name' })
            .populate({ path: 'carrier', select: 'name' })
            .sort(sortOptions)
            .limit(limit)
            .skip((page - 1) * limit)
            .lean();
        total = await Shipment.countDocuments(finalQuery);
      }
      
      logger.info(`Found ${shipments.length} shipments, total matching query: ${total}. Sending response.`);
      res.status(200).json({ success: true, message: "Shipments fetched successfully", data: { shipments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }, });

    } catch (error: any) { 
        logger.error('CRITICAL ERROR in getShipments:', { message: error.message, stack: error.stack }); 
        res.status(500).json({ success: false, message: 'Internal server error while fetching shipments.' }); 
    }
  }

  async updateShipment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info(`--- UPDATE SHIPMENT - START (ID: ${id}) ---`);
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid shipment ID format.' });
    }
    
    try {
        const shipmentToUpdate = await Shipment.findById(id);
        if (!shipmentToUpdate) {
             return res.status(404).json({ success: false, message: 'Shipment not found' });
        }
        
        const updateData = req.body;

        const finalData = { ...shipmentToUpdate.toObject(), ...updateData };
        finalData.origin = { ...shipmentToUpdate.origin, ...updateData.origin };
        finalData.destination = { ...shipmentToUpdate.destination, ...updateData.destination };
        finalData.transloadFacility = { ...shipmentToUpdate.transloadFacility, ...updateData.transloadFacility };
        
        Object.assign(shipmentToUpdate, finalData);

        if (updateData.documentIds && Array.isArray(updateData.documentIds)) {
    shipmentToUpdate.documents = updateData.documentIds
        .filter((id: any) => mongoose.Types.ObjectId.isValid(id))
        .map((id: any) => new mongoose.Types.ObjectId(id));
}

        const financials = calculateFinancials(shipmentToUpdate.toObject());
        Object.assign(shipmentToUpdate, financials);

        if (req.user?._id) {
            shipmentToUpdate.updatedBy = new mongoose.Types.ObjectId(req.user._id.toString());
        }

        const savedShipment = await shipmentToUpdate.save();
        logger.info('Shipment update and save successful.', { shipmentId: savedShipment._id });
        
        laneRateService.recordLaneRateFromShipment(savedShipment.toObject()).catch(err => {
          logger.error(`Failed to record lane rate in background for updated shipment ${savedShipment.shipmentNumber}`, { error: err.message });
        });
        
        const populatedShipment = await Shipment.findById(savedShipment._id)
            .populate([ /* ... all populate paths ... */ ]).lean();

        res.status(200).json({ success: true, data: populatedShipment, message: 'Shipment updated successfully' });

    } catch (error: any) {
        logger.error(`CRITICAL ERROR in updateShipment (ID: ${id}):`, { message: error.message, stack: error.stack });
        if (error.name === 'ValidationError') {
            res.status(400).json({ success: false, message: error.message, errors: error.errors });
        } else {
            res.status(500).json({ success: false, message: 'Error updating shipment', errorDetails: error.message });
        }
    }
  }

  async getShipmentById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info(`Attempting to get shipment by ID: ${id}`);
    if (!mongoose.Types.ObjectId.isValid(id)) { 
        res.status(400).json({ success: false, message: 'Invalid shipment ID format.' }); 
        return; 
    }
    try {
        const shipment = await Shipment.findById(id)
            .populate({ path: 'shipper', select: 'name contact _id' })
            .populate({ path: 'carrier', select: 'name contact mcNumber dotNumber _id' })
            .populate({ path: 'createdBy', select: 'firstName lastName email _id' })
            .populate({ path: 'updatedBy', select: 'firstName lastName email _id' })
            .populate({ path: 'checkIns.createdBy', select: 'firstName lastName email _id'})
            .populate({ path: 'documents', select: 'originalName mimetype size createdAt path _id'})
            .populate({ path: 'accessorials.accessorialTypeId', model: 'AccessorialType', select: 'name code unitName defaultCustomerRate defaultCarrierCost' })
            .lean();
        if (!shipment) { 
            res.status(404).json({ success: false, message: 'Shipment not found.' }); 
            return; 
        }
        logger.info(`Successfully fetched shipment ID: ${id}`);
        res.status(200).json({ success: true, data: shipment });
    } catch (error: any) { 
        logger.error(`Error fetching shipment by ID ${id}:`, { message: error.message, stack: error.stack }); 
        res.status(500).json({ success: false, message: 'Error fetching shipment details.', errorDetails: error.message });
    }
  }

  async addCheckIn(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info(`Attempting to add check-in for shipment ID: ${id}`, { body: req.body });
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) { 
        res.status(400).json({ success: false, message: 'Invalid shipment ID.'}); 
        return;
      }
      const checkInData = { ...req.body };

      if (!checkInData.method || !checkInData.notes || !checkInData.dateTime) {
        res.status(400).json({ success: false, message: "Date/Time, Method, and Notes are required for check-in."});
        return;
      }
      if (!checkInData.createdBy && req.user?._id) {
          checkInData.createdBy = req.user._id;
      } else if (!checkInData.createdBy) {
          const defaultUser = await User.findOne({ email: 'admin@example.com' }).select('_id').lean();
          if (defaultUser) checkInData.createdBy = defaultUser._id.toString();
          else { 
            logger.error("Cannot add check-in: createdBy field is missing and no default user found."); 
            res.status(400).json({ success: false, message: "User information missing for check-in." }); 
            return; 
          }
      } else if (typeof checkInData.createdBy === 'string' && mongoose.Types.ObjectId.isValid(checkInData.createdBy)){
          checkInData.createdBy = new mongoose.Types.ObjectId(checkInData.createdBy);
      }

      const shipment = await Shipment.findByIdAndUpdate(id, { $push: { checkIns: checkInData } }, { new: true, runValidators: true })
        .populate({ path: 'shipper', select: 'name' }).populate({ path: 'carrier', select: 'name' })
        .populate({ path: 'checkIns.createdBy', select: 'firstName lastName email' }).lean();
      if (!shipment) { 
        res.status(404).json({ success: false, message: 'Shipment not found' }); 
        return; 
      }
      logger.info('Check-in added successfully for shipment ID:', id);
      res.status(200).json({ success: true, data: shipment, message: 'Check-in added successfully' });
    } catch (error: any) {
      logger.error('CRITICAL ERROR in addCheckIn:', { message: error.message, stack: error.stack, params: req.params, body: req.body });
      res.status(500).json({ success: false, message: 'Error adding check-in', errorDetails: error.message });
    }
  }
  
  async deleteShipment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info(`Attempting to delete shipment/quote with ID: ${id}`);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid ID format.' }); 
      return;
    }

    try {
      const shipment = await Shipment.findById(id);
      if (!shipment) {
        res.status(404).json({ success: false, message: 'Shipment or Quote not found.' }); 
        return;
      }
      
      await LaneRate.deleteOne({ sourceShipmentId: id });
      logger.info(`Deleted associated lane rate for shipment ID: ${id}`);
      
      await Shipment.findByIdAndDelete(id);

      logger.info(`Shipment/Quote with ID: ${id} deleted successfully.`);
      res.status(200).json({ success: true, message: 'Shipment/Quote deleted successfully.' });

    } catch (error: any) {
      logger.error('Error deleting shipment/quote:', { message: error.message, stack: error.stack, id });
      res.status(500).json({ success: false, message: 'Error deleting shipment/quote.', errorDetails: error.message });
    }
  }

  async generateStatusEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info(`Attempting to generate status email for shipment ID: ${id}`);
    try {
      const aiService = getAIEmailService();
      if (!mongoose.Types.ObjectId.isValid(id)) { 
        res.status(400).json({ success: false, message: 'Invalid shipment ID.'}); 
        return; 
      }
      const shipment = await Shipment.findById(id).populate({ path: 'shipper', select: 'name contact' }).populate({ path: 'carrier', select: 'name' }).lean();
      if (!shipment) { 
        res.status(404).json({ success: false, message: 'Shipment not found' }); 
        return; 
      }
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === '') { 
        logger.error('OPENAI_API_KEY is not set or is empty.');
        res.status(503).json({ success: false, message: 'AI Service not configured properly (Missing API Key).' }); 
        return; 
      }
      const emailContent = await aiService.generateStatusUpdate(shipment);
      logger.info('Status email content generated for shipment ID:', id);
      res.status(200).json({ success: true, data: { emailContent, shipmentNumber: shipment.shipmentNumber, shipmentForContext: shipment } });
    } catch (error: any) {
      logger.error('CRITICAL ERROR in generateStatusEmail:', { message: error.message, stack: error.stack, params: req.params });
      if (error.message && (error.message.includes('API key') || error.message.includes('AIEmailService'))) {
          res.status(503).json({ success: false, message: 'Error with AI service.', errorDetails: error.message });
          return; 
      }
      res.status(500).json({ success: false, message: 'Error generating status email', errorDetails: error.message });
    }
  }

  async updateShipmentTags(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info(`Attempting to update tags for shipment ID: ${id}`, { body: req.body });
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {  
        res.status(400).json({ success: false, message: 'Invalid shipment ID.'}); 
        return;
      }
      const { tags } = req.body;
      if (!Array.isArray(tags)) { 
        res.status(400).json({ success: false, message: 'Tags must be an array.' }); 
        return; 
      }
      const shipment = await Shipment.findByIdAndUpdate(id, { customTags: tags }, { new: true, runValidators: true }).lean();
      if (!shipment) { 
        res.status(404).json({ success: false, message: 'Shipment not found' }); 
        return; 
      }
      logger.info('Tags updated successfully for shipment ID:', id);
      res.status(200).json({ success: true, data: shipment, message: 'Tags updated successfully' });
    } catch (error: any) {
      logger.error('CRITICAL ERROR in updateShipmentTags:', { message: error.message, stack: error.stack, params: req.params, body: req.body });
      res.status(500).json({ success: false, message: 'Error updating tags', errorDetails: error.message });
    }
  }
}