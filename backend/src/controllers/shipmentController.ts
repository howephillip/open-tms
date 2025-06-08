// File: backend/src/controllers/shipmentController.ts
import { Response } from 'express';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest'; // Assuming this path is correct
import mongoose from 'mongoose';
import { Shipment, IShipment, IReferenceNumber, ModeOfTransportType, ShipmentStatusType, IQuoteAccessorial } from '../models/Shipment';
import { Carrier } from '../models/Carrier';
import { Shipper } from '../models/Shipper';
import { User } from '../models/User';
import { Document as DocModel } from '../models/Document';
import { ApplicationSettings, IQuoteFormSettings } from '../models/ApplicationSettings';
import { AIEmailService } from '../services/ai/emailService';
import { logger } from '../utils/logger';

let aiEmailServiceInstance: AIEmailService | null = null;

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
    if (!sortQueryString) return { createdAt: -1 }; // Default sort
    const sortOptions: Record<string, 1 | -1> = {};
    sortQueryString.split(',').forEach(part => {
        const trimmedPart = part.trim();
        if (trimmedPart.startsWith('-')) {
            sortOptions[trimmedPart.substring(1)] = -1;
        } else {
            sortOptions[trimmedPart] = 1;
        }
    });
    // Corrected: Ensure it returns a valid object even if sortOptions is empty
    return Object.keys(sortOptions).length > 0 ? sortOptions : { createdAt: -1 }; 
};

const defaultControllerQuoteFormSettings: IQuoteFormSettings = {
    requiredFields: [
        'shipper', 'modeOfTransport', 'equipmentType',
        'origin.city', 'origin.state',
        'destination.city', 'destination.state',
        'scheduledPickupDate',
        'commodityDescription',
        'customerRate'
    ],
    quoteNumberPrefix: 'QT-',
    quoteNumberNextSequence: 1001,
};
logger.info('SHIPMENT CONTROLLER: defaultControllerQuoteFormSettings has been defined at module scope.');

const getFieldValue = (payload: any, fieldId: string): any => {
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

export class ShipmentController {
  async createShipment(req: AuthenticatedRequest, res: Response): Promise<void> {
    logger.info('--- ENTERING createShipment ---');
    try {
      let activeQuoteFormSettings: IQuoteFormSettings = { ...defaultControllerQuoteFormSettings };
      try {
        const settingsDoc = await ApplicationSettings.findOne({ key: 'quoteForm' }).lean();
        if (settingsDoc && settingsDoc.settings) {
          const dbSettings = settingsDoc.settings as IQuoteFormSettings;
          activeQuoteFormSettings = {
            requiredFields: dbSettings.requiredFields && dbSettings.requiredFields.length > 0 ? dbSettings.requiredFields : defaultControllerQuoteFormSettings.requiredFields,
            quoteNumberPrefix: dbSettings.quoteNumberPrefix || defaultControllerQuoteFormSettings.quoteNumberPrefix,
            quoteNumberNextSequence: dbSettings.quoteNumberNextSequence || defaultControllerQuoteFormSettings.quoteNumberNextSequence,
          };
          logger.info('Loaded quote form settings from DB for validation:', activeQuoteFormSettings.requiredFields);
        } else {
          logger.warn('No quote form settings found in DB for validation, using controller defaults:', activeQuoteFormSettings.requiredFields);
        }
      } catch (settingsError: any) {
        logger.error('Error fetching quoteForm settings, using controller defaults:', settingsError.message);
      }

      const {
        documentIds,
        accessorials: accessorialsData,
        fscType, fscCustomerAmount, fscCarrierAmount,
        chassisCustomerCost, chassisCarrierCost,
        ...shipmentPayload
      } = req.body;

      logger.info('Shipment payload received for validation:', JSON.stringify(shipmentPayload, null, 2));
      const missingFields: string[] = [];

      if (!shipmentPayload.createdBy) missingFields.push('createdBy (System)');
      if (!shipmentPayload.status) missingFields.push('status (System)');
      
      if (shipmentPayload.status === 'quote') {
        logger.info('Validating as a QUOTE using settings:', activeQuoteFormSettings.requiredFields);
        (activeQuoteFormSettings.requiredFields || []).forEach(fieldId => {
          const value = getFieldValue(shipmentPayload, fieldId);
          if (fieldId === 'carrier' && !shipmentPayload.carrier) { return; }
          if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
            missingFields.push(fieldId);
          }
        });
      } else { 
        logger.info('Validating as a non-quote SHIPMENT.');
        const universallyRequiredForBooked = [
            'shipper', 'carrier', 'modeOfTransport',
            'origin.city', 'origin.state', 
            'destination.city', 'destination.state',
            'scheduledPickupDate', 'scheduledDeliveryDate', 
            'equipmentType', 'commodityDescription',
            'customerRate', 'carrierCostTotal'
        ];
        universallyRequiredForBooked.forEach(fieldId => {
             const value = getFieldValue(shipmentPayload, fieldId);
             if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
                missingFields.push(fieldId);
             }
        });
      }

      if (missingFields.length > 0) {
        const uniqueMissingFields = [...new Set(missingFields)];
        logger.warn(`Validation Error: Missing required fields. Missing: ${uniqueMissingFields.join(', ')}.`);
        res.status(400).json({ success: false, message: `Missing required fields: ${uniqueMissingFields.join(', ')}.` });
        return;
      }

      const shipmentData: Partial<IShipment> = { ...shipmentPayload };

      // Shipper processing
      if (shipmentData.hasOwnProperty('shipper')) {
        const shipperValue = shipmentData.shipper;
        if (typeof shipperValue === 'string') {
            if (shipperValue.trim() === '') { // Check for empty string first
                logger.warn('Shipper ID is an empty string for createShipment.');
                res.status(400).json({ success: false, message: 'Shipper ID cannot be empty.' }); return;
            } else if (mongoose.Types.ObjectId.isValid(shipperValue)) {
                shipmentData.shipper = new mongoose.Types.ObjectId(shipperValue);
            } else {
                logger.warn(`Invalid shipper ID format: ${shipperValue}`);
                res.status(400).json({ success: false, message: 'Invalid Shipper ID format.' }); return;
            }
        } else if (shipperValue === null || shipperValue === undefined) {
            logger.warn('Shipper ID is missing or null for createShipment.');
            res.status(400).json({ success: false, message: 'Shipper ID is required.' }); return;
        } // If already ObjectId, it's fine
      } else if (!shipmentData.shipper) { 
         logger.warn('Shipper ID is missing from payload for createShipment.');
         res.status(400).json({ success: false, message: 'Shipper ID is required.' }); return;
      }

      // Carrier processing
      if (shipmentData.hasOwnProperty('carrier')) {
        const carrierValue = shipmentData.carrier;
        if (typeof carrierValue === 'string') {
            if (carrierValue.trim() === '') {
                delete shipmentData.carrier; 
            } else if (mongoose.Types.ObjectId.isValid(carrierValue)) {
                shipmentData.carrier = new mongoose.Types.ObjectId(carrierValue);
            } else { 
                logger.warn(`Invalid carrier ID: ${carrierValue}`);
                res.status(400).json({success:false, message: "Invalid Carrier ID format."}); return;
            }
        } else if (carrierValue === null || carrierValue === undefined) {
             delete shipmentData.carrier;
        }
      } else if (shipmentPayload.status !== 'quote' && !shipmentData.carrier) {
         logger.warn('Carrier ID is missing for non-quote shipment.');
         res.status(400).json({ success: false, message: 'Carrier ID is required for booked shipments.' }); return;
      }


      if (shipmentData.createdBy && typeof shipmentData.createdBy === 'string') {
        if (mongoose.Types.ObjectId.isValid(shipmentData.createdBy)) {
            shipmentData.createdBy = new mongoose.Types.ObjectId(shipmentData.createdBy);
        } else {
            logger.warn(`Invalid createdBy ID: ${shipmentData.createdBy}`);
            res.status(400).json({ success: false, message: 'Invalid createdBy ID format.' }); return;
        }
      }
      
      // ... (rest of the createShipment method from previous correct version) ...
      if (shipmentPayload.otherReferenceNumbersString && typeof shipmentPayload.otherReferenceNumbersString === 'string') {
        try {
            shipmentData.otherReferenceNumbers = shipmentPayload.otherReferenceNumbersString.split(',')
                .map((refStr: string) => { const parts = refStr.split(':'); const type = parts[0]?.trim(); const value = parts.slice(1).join(':')?.trim(); return { type, value }; })
                .filter((ref: any) => ref.type && ref.value) as IReferenceNumber[];
        } catch (e) { logger.warn("Could not parse otherReferenceNumbersString.", e); shipmentData.otherReferenceNumbers = []; }
      } else if (Array.isArray(shipmentPayload.otherReferenceNumbers)) {
        shipmentData.otherReferenceNumbers = shipmentPayload.otherReferenceNumbers.filter((ref: any) => typeof ref === 'object' && ref.type && ref.value) as IReferenceNumber[];
      }

      if (documentIds && Array.isArray(documentIds)) {
        shipmentData.documents = documentIds.filter(id => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
      } else { shipmentData.documents = []; }

      if (accessorialsData && Array.isArray(accessorialsData)) {
        shipmentData.accessorials = accessorialsData.map((acc: any) => ({
          accessorialTypeId: new mongoose.Types.ObjectId(acc.accessorialTypeId), name: acc.name,
          quantity: parseFloat(acc.quantity) || 1, customerRate: parseFloat(acc.customerRate) || 0,
          carrierCost: parseFloat(acc.carrierCost) || 0, notes: acc.notes
        })).filter((acc: any) => mongoose.Types.ObjectId.isValid(acc.accessorialTypeId));
      } else { shipmentData.accessorials = []; }

      if (fscType !== undefined && fscType !== '') shipmentData.fscType = fscType; else delete shipmentData.fscType;
      if (fscCustomerAmount !== undefined && fscCustomerAmount !== null && fscCustomerAmount !== '') shipmentData.fscCustomerAmount = parseFloat(fscCustomerAmount); else delete shipmentData.fscCustomerAmount;
      if (fscCarrierAmount !== undefined && fscCarrierAmount !== null && fscCarrierAmount !== '') shipmentData.fscCarrierAmount = parseFloat(fscCarrierAmount); else delete shipmentData.fscCarrierAmount;

      if (chassisCustomerCost !== undefined && chassisCustomerCost !== null && chassisCustomerCost !== '') shipmentData.chassisCustomerCost = parseFloat(chassisCustomerCost); else delete shipmentData.chassisCustomerCost;
      if (chassisCarrierCost !== undefined && chassisCarrierCost !== null && chassisCarrierCost !== '') shipmentData.chassisCarrierCost = parseFloat(chassisCarrierCost); else delete shipmentData.chassisCarrierCost;

      const dateFields: (keyof Partial<IShipment>)[] = ['lastFreeDayPort', 'lastFreeDayRail', 'emptyContainerReturnByDate', 'chassisReturnByDate', 'transloadDate', 'scheduledPickupDate', 'scheduledDeliveryDate', 'actualPickupDateTime', 'actualDeliveryDateTime', 'quoteValidUntil'];
      dateFields.forEach(field => { if (shipmentData[field] && typeof shipmentData[field] === 'string') { const dateVal = new Date(shipmentData[field] as string); if (!isNaN(dateVal.getTime())) (shipmentData as any)[field] = dateVal; else { (shipmentData as any)[field] = undefined; }} });

      const shipment = new Shipment(shipmentData);
      await shipment.save();
      logger.info('Shipment saved successfully', { shipmentId: shipment._id, shipmentNumber: shipment.shipmentNumber });

      const populatedShipment = await Shipment.findById(shipment._id)
        .populate({ path: 'shipper', select: 'name' }).populate({ path: 'carrier', select: 'name' })
        .populate({ path: 'createdBy', select: 'firstName lastName email'})
        .populate({ path: 'documents', select: 'originalName _id mimetype size createdAt path'})
        .populate({ path: 'accessorials.accessorialTypeId', select: 'name code unitName' })
        .lean();
      res.status(201).json({ success: true, data: populatedShipment, message: 'Shipment created successfully' });

    } catch (error: any) {
      logger.error('CRITICAL ERROR in createShipment:', { message: error.message, name: error.name, stack: error.stack, requestBody: req.body, errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error), 2) });
      if (error.name === 'ValidationError') {
        res.status(400).json({ success: false, message: error.message, errors: error.errors });
      } else if (error.code === 11000) {
        res.status(409).json({ success: false, message: `Duplicate key error. Field: ${JSON.stringify(error.keyValue)}`, errorDetails: error.keyValue });
      } else {
        res.status(500).json({ success: false, message: 'Error creating shipment', errorDetails: error.message });
      }
    }
  }

  async getShipments(req: AuthenticatedRequest, res: Response): Promise<void> {
    logger.info('Attempting to get shipments. Query params:', req.query);
    try {
      const pageQuery = req.query.page as string | undefined;
      const limitQuery = req.query.limit as string | undefined;
      const sortQueryString = req.query.sort as string | undefined || '-createdAt';
      const sortOptions = parseSortQuery(sortQueryString);

      const page = pageQuery ? parseInt(pageQuery, 10) : 1;
      const limit = limitQuery ? parseInt(limitQuery, 10) : 100;

      if (isNaN(page) || page < 1) { res.status(400).json({ success: false, message: 'Invalid page number.'}); return; }
      if (isNaN(limit) || limit < 1) { res.status(400).json({ success: false, message: 'Invalid limit number.'}); return; }

      let query: any = {};
      const {
        status, statusesNotIn,
        tags, shipper, carrier, startDate, endDate, shipmentNumber,
        modeOfTransport, containerNumber, deliveryOrderNumber, proNumber, billOfLadingNumber,
        purchaseOrderNumbers, searchTerm
      } = req.query;

      const specificFilters: any = {};
      if (shipmentNumber) specificFilters.shipmentNumber = { $regex: shipmentNumber as string, $options: 'i'};
      if (billOfLadingNumber) specificFilters.billOfLadingNumber = { $regex: billOfLadingNumber as string, $options: 'i'};
      if (proNumber) specificFilters.proNumber = { $regex: proNumber as string, $options: 'i'};

      if (status) {
        specificFilters.status = status as string;
      } else if (statusesNotIn) {
        const notInArray = Array.isArray(statusesNotIn) ? statusesNotIn : (statusesNotIn as string).split(',');
        specificFilters.status = { $nin: notInArray };
      }

      if (modeOfTransport) specificFilters.modeOfTransport = modeOfTransport as string;
      if (containerNumber) specificFilters.containerNumber = { $regex: containerNumber as string, $options: 'i'};
      if (deliveryOrderNumber) specificFilters.deliveryOrderNumber = { $regex: deliveryOrderNumber as string, $options: 'i'};
      if (purchaseOrderNumbers && typeof purchaseOrderNumbers === 'string') specificFilters.purchaseOrderNumbers = { $in: purchaseOrderNumbers.split(',').map(po => po.trim()).filter(po => po) };
      if (tags && typeof tags === 'string') specificFilters.customTags = { $in: tags.split(',').map(tag=>tag.trim()).filter(tag=>tag) };
      if (shipper && mongoose.Types.ObjectId.isValid(shipper as string)) specificFilters.shipper = new mongoose.Types.ObjectId(shipper as string);
      if (carrier && mongoose.Types.ObjectId.isValid(carrier as string)) specificFilters.carrier = new mongoose.Types.ObjectId(carrier as string);

      if (startDate || endDate) {
        specificFilters.scheduledPickupDate = {};
        if (startDate) specificFilters.scheduledPickupDate.$gte = new Date(startDate as string);
        if (endDate) specificFilters.scheduledPickupDate.$lte = new Date(endDate as string);
      }

      let shipments: IShipment[];
      let total: number;

      if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim() !== '') {
        const searchStr = searchTerm.trim();
        const searchRegex = { $regex: searchStr, $options: 'i' };
        const textSearchOrConditions: any[] = [
            { shipmentNumber: searchRegex }, { billOfLadingNumber: searchRegex }, { proNumber: searchRegex }, { containerNumber: searchRegex },
            { deliveryOrderNumber: searchRegex }, { bookingNumber: searchRegex }, { pickupNumber: searchRegex }, { proofOfDeliveryNumber: searchRegex },
            { purchaseOrderNumbers: searchRegex }, { 'otherReferenceNumbers.value': searchRegex }, { 'otherReferenceNumbers.type': searchRegex },
            { 'origin.name': searchRegex }, { 'origin.city': searchRegex }, { 'origin.state': searchRegex }, { 'origin.zip': searchRegex }, { 'origin.address': searchRegex }, { 'origin.contactName': searchRegex }, { 'origin.contactEmail': searchRegex },
            { 'destination.name': searchRegex }, { 'destination.city': searchRegex }, { 'destination.state': searchRegex }, { 'destination.zip': searchRegex }, { 'destination.address': searchRegex }, { 'destination.contactName': searchRegex }, { 'destination.contactEmail': searchRegex },
            { commodityDescription: searchRegex }, { equipmentType: searchRegex }, { terminal: searchRegex }, { steamshipLine: searchRegex }, { vesselName: searchRegex },
            { railOriginRamp: searchRegex }, { railDestinationRamp: searchRegex }, { railCarrier: searchRegex },
            { airline: searchRegex }, { flightNumber: searchRegex }, { masterAirWaybill: searchRegex }, { houseAirWaybill: searchRegex }
        ];
        const basePipeline: mongoose.PipelineStage[] = [ { $match: specificFilters }, { $lookup: { from: 'shippers', localField: 'shipper', foreignField: '_id', as: 'shipperDoc' }}, { $unwind: { path: '$shipperDoc', preserveNullAndEmptyArrays: true } }, { $lookup: { from: 'carriers', localField: 'carrier', foreignField: '_id', as: 'carrierDoc' }}, { $unwind: { path: '$carrierDoc', preserveNullAndEmptyArrays: true } }, { $lookup: { from: 'users', localField: 'createdBy', foreignField: '_id', as: 'createdByUserDoc' }}, { $unwind: { path: '$createdByUserDoc', preserveNullAndEmptyArrays: true } }, ];
        const searchMatchStage: mongoose.PipelineStage.Match = { $match: { $or: [ ...textSearchOrConditions, { 'shipperDoc.name': searchRegex }, { 'shipperDoc.contact.name': searchRegex }, { 'shipperDoc.contact.email': searchRegex }, { 'shipperDoc.contact.phone': searchRegex }, { 'carrierDoc.name': searchRegex }, { 'carrierDoc.mcNumber': searchRegex }, { 'carrierDoc.dotNumber': searchRegex }, { 'carrierDoc.contact.name': searchRegex }, { 'carrierDoc.contact.email': searchRegex }, { 'carrierDoc.contact.phone': searchRegex }, ]}};
         if (mongoose.Types.ObjectId.isValid(searchStr)) { (searchMatchStage.$match.$or as any[]).push({ 'shipperDoc._id': new mongoose.Types.ObjectId(searchStr) }); (searchMatchStage.$match.$or as any[]).push({ 'carrierDoc._id': new mongoose.Types.ObjectId(searchStr) }); }
        const projectStage: mongoose.PipelineStage.Project = { $project: { _id: 1, shipmentNumber: 1, billOfLadingNumber: 1, proNumber: 1, deliveryOrderNumber: 1, bookingNumber: 1, containerNumber: 1, sealNumber: 1, pickupNumber: 1, proofOfDeliveryNumber: 1, purchaseOrderNumbers: 1, otherReferenceNumbers: 1, shipper: { _id: '$shipperDoc._id', name: '$shipperDoc.name', contact: '$shipperDoc.contact' }, carrier: { _id: '$carrierDoc._id', name: '$carrierDoc.name', mcNumber: '$carrierDoc.mcNumber', dotNumber: '$carrierDoc.dotNumber', contact: '$carrierDoc.contact'}, consignee: 1, billTo: 1, modeOfTransport: 1, steamshipLine:1, vesselName:1, voyageNumber:1, terminal:1, lastFreeDayPort:1, lastFreeDayRail:1, emptyReturnDepot:1, emptyContainerReturnByDate:1, chassisNumber:1, chassisType:1, chassisProvider:1, chassisReturnByDate:1, railOriginRamp:1, railDestinationRamp:1, railCarrier:1, airline:1, flightNumber:1, masterAirWaybill:1, houseAirWaybill:1, airportOfDeparture:1, airportOfArrival:1, isTransload:1, transloadFacility:1, transloadDate:1, origin:1, destination:1, scheduledPickupDate:1, scheduledPickupTime:1, pickupAppointmentNumber:1, actualPickupDateTime:1, scheduledDeliveryDate:1, scheduledDeliveryTime:1, deliveryAppointmentNumber:1, actualDeliveryDateTime:1, status:1, equipmentType:1, equipmentLength:1, equipmentUnit:1, commodityDescription:1, pieceCount:1, packageType:1, totalWeight:1, weightUnit:1, isHazardous:1, unNumber:1, hazmatClass:1, isTemperatureControlled:1, temperatureMin:1, temperatureMax:1, tempUnit:1, customerRate:1, carrierCostTotal:1, grossProfit:1, margin:1, internalNotes:1, specialInstructions:1, customTags:1, checkIns:1, documents:1,  createdBy: { _id: '$createdByUserDoc._id', firstName: '$createdByUserDoc.firstName', lastName: '$createdByUserDoc.lastName', email: '$createdByUserDoc.email'}, createdAt:1, updatedAt:1, fscType: 1, fscCustomerAmount: 1, fscCarrierAmount: 1, chassisCustomerCost: 1, chassisCarrierCost: 1, totalCustomerRate: 1, totalCarrierCost: 1 }};
        const dataPipeline: mongoose.PipelineStage[] = [ ...basePipeline, searchMatchStage, { $sort: sortOptions }, { $skip: (page - 1) * limit }, { $limit: limit }, projectStage ];
        const countPipeline: mongoose.PipelineStage[] = [ ...basePipeline, searchMatchStage, { $count: 'total' } ];
        logger.info('Executing AGGREGATION pipeline for data with searchTerm:', searchStr, 'Filters:', JSON.stringify(specificFilters));
        shipments = await Shipment.aggregate(dataPipeline);
        const countResult = await Shipment.aggregate(countPipeline);
        total = countResult.length > 0 ? countResult[0].total : 0;
      } else {
        query = specificFilters;
        logger.info('Executing find().populate() (no global search):', JSON.stringify(query));
        shipments = await Shipment.find(query)
            .populate({ path: 'shipper', select: 'name contact' })
            .populate({ path: 'carrier', select: 'name contact mcNumber dotNumber' })
            .populate({ path: 'createdBy', select: 'firstName lastName email'})
            .sort(sortOptions)
            .limit(limit)
            .skip((page - 1) * limit)
            .lean();
        total = await Shipment.countDocuments(query);
      }
      logger.info(`Found ${shipments.length} shipments, total matching query: ${total}. Sending response.`);
      res.status(200).json({ success: true, message: "Shipments fetched successfully", data: { shipments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }, });
    } catch (error: any) { logger.error('CRITICAL ERROR in getShipments:', { message: error.message, name: error.name, stack: error.stack, query: req.query, errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}); res.status(500).json({ success: false, message: 'Internal server error while fetching shipments.', errorDetails: error.message }); }
  }

  async updateShipment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info(`--- UPDATE SHIPMENT - START (ID: ${id}) ---`);
    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid shipment ID format.' });
        return;
    }
    
    try {
        const originalDoc = await Shipment.findById(id).lean();
        if (!originalDoc) {
             return res.status(404).json({ success: false, message: 'Shipment not found' });
        }
        
        const updateData = req.body;
        
        // --- CORRECTED MERGE LOGIC ---
        // Start with the original document, then carefully apply updates.
        const finalState = { ...originalDoc };

        for (const key in updateData) {
            if (Object.prototype.hasOwnProperty.call(updateData, key)) {
                // This will overwrite originalDoc fields with what came from the frontend.
                // If a field was empty on the form (like fscType), it will be `""` here.
                (finalState as any)[key] = updateData[key];
            }
        }
        
        // --- Start Financial Calculations on the merged `finalState` ---
        const lineHaulCustomer = parseFloat(String(finalState.customerRate)) || 0;
        const lineHaulCarrier = parseFloat(String(finalState.carrierCostTotal)) || 0;
        
        let fscCustomerValue = 0;
        if (finalState.fscType === 'percentage' && finalState.fscCustomerAmount) {
            fscCustomerValue = lineHaulCustomer * (parseFloat(String(finalState.fscCustomerAmount)) / 100);
        } else if (finalState.fscType === 'fixed' && finalState.fscCustomerAmount) {
            fscCustomerValue = parseFloat(String(finalState.fscCustomerAmount));
        }

        let fscCarrierValue = 0;
        if (finalState.fscType === 'percentage' && finalState.fscCarrierAmount) {
            fscCarrierValue = lineHaulCarrier * (parseFloat(String(finalState.fscCarrierAmount)) / 100);
        } else if (finalState.fscType === 'fixed' && finalState.fscCarrierAmount) {
            fscCarrierValue = parseFloat(String(finalState.fscCarrierAmount));
        }

        const chassisCustomerCost = parseFloat(String(finalState.chassisCustomerCost)) || 0;
        const chassisCarrierCost = parseFloat(String(finalState.chassisCarrierCost)) || 0;

        let totalAccessorialsCustomerCost = 0;
        let totalAccessorialsCarrierCost = 0;
        
        const accessorials = finalState.accessorials;
        if (Array.isArray(accessorials)) {
            accessorials.forEach((acc: any) => {
                totalAccessorialsCustomerCost += (parseFloat(String(acc.customerRate)) || 0) * (parseFloat(String(acc.quantity)) || 1);
                totalAccessorialsCarrierCost += (parseFloat(String(acc.carrierCost)) || 0) * (parseFloat(String(acc.quantity)) || 1);
            });
        }
        
        const totalCustomerRate = lineHaulCustomer + fscCustomerValue + chassisCustomerCost + totalAccessorialsCustomerCost;
        const totalCarrierCost = lineHaulCarrier + fscCarrierValue + chassisCarrierCost + totalAccessorialsCarrierCost;
        const grossProfit = totalCustomerRate - totalCarrierCost;
        const margin = totalCustomerRate > 0 ? (grossProfit / totalCustomerRate) * 100 : 0;
        
        // --- Build the final update payload, including calculated fields ---
        const updatePayload: Record<string, any> = {
            ...updateData,
            totalCustomerRate,
            totalCarrierCost,
            grossProfit,
            margin,
        };

        if (req.user?._id) {
            updatePayload.updatedBy = new mongoose.Types.ObjectId(req.user._id.toString());
        }

        // --- Atomically update the document in the database ---
        const updatedShipment = await Shipment.findByIdAndUpdate(
            id,
            { $set: updatePayload }, 
            { new: true, runValidators: true, context: 'query' }
        )
        .populate([
            { path: 'shipper', select: 'name' },
            { path: 'carrier', select: 'name' },
            { path: 'createdBy', select: 'firstName lastName email'},
            { path: 'updatedBy', select: 'firstName lastName email'},
            { path: 'documents', select: 'originalName _id mimetype size createdAt path'},
            { path: 'accessorials.accessorialTypeId', model: 'AccessorialType', select: 'name code unitName' }
        ]).lean();

        logger.info('Shipment update successful and persisted to DB.', { shipmentId: updatedShipment?._id });
        res.status(200).json({ success: true, data: updatedShipment, message: 'Shipment updated successfully' });

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
      logger.error('CRITICAL ERROR in addCheckIn:', { message: error.message, name: error.name, stack: error.stack, params: req.params, body: req.body, errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error), 2) });
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
      // Ensure OPENAI_API_KEY is accessed correctly
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === '') { 
        logger.error('OPENAI_API_KEY is not set or is empty.');
        res.status(503).json({ success: false, message: 'AI Service not configured properly (Missing API Key).' }); 
        return; 
      }
      const emailContent = await aiService.generateStatusUpdate(shipment);
      logger.info('Status email content generated for shipment ID:', id);
      res.status(200).json({ success: true, data: { emailContent, shipmentNumber: shipment.shipmentNumber, shipmentForContext: shipment } });
    } catch (error: any) {
      logger.error('CRITICAL ERROR in generateStatusEmail:', { message: error.message, name: error.name, stack: error.stack, params: req.params, errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error), 2) });
      if (error.message && (error.message.includes('API key') || error.message.includes('OpenAI') || error.message.includes('AIEmailService could not be initialized'))) {
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
      logger.error('CRITICAL ERROR in updateShipmentTags:', { message: error.message, name: error.name, stack: error.stack, params: req.params, body: req.body, errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error), 2) });
      res.status(500).json({ success: false, message: 'Error updating tags', errorDetails: error.message });
    }
  }
}