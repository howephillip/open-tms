// File: backend/src/controllers/carrierController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Carrier, ICarrier } from '../models/Carrier';
import { Shipment } from '../models/Shipment'; // Uses the named export 'Shipment'
import { SaferService } from '../services/integrations/saferService';
import { logger } from '../utils/logger';

const saferService = new SaferService();

const parseSortQuery = (sortQueryString?: string): Record<string, 1 | -1> => {
    if (!sortQueryString) return { name: 1 };
    const sortOptions: Record<string, 1 | -1> = {};
    sortQueryString.split(',').forEach(part => {
        const trimmedPart = part.trim();
        if (trimmedPart.startsWith('-')) {
            sortOptions[trimmedPart.substring(1)] = -1;
        } else {
            sortOptions[trimmedPart] = 1;
        }
    });
    return sortOptions;
};

export class CarrierController {
  async getCarriers(req: Request, res: Response): Promise<void> {
    logger.info('Attempting to get carriers. Query params:', req.query);
    try {
      const pageQuery = req.query.page as string | undefined;
      const limitQuery = req.query.limit as string | undefined;
      const sortQueryString = req.query.sort as string | undefined || 'name';
      const sortOptions = parseSortQuery(sortQueryString);

      const page = pageQuery ? parseInt(pageQuery, 10) : 1;
      const limit = limitQuery ? parseInt(limitQuery, 10) : 100;

      if (isNaN(page) || page < 1) { 
        res.status(400).json({ success: false, message: 'Invalid page number.' }); 
        return; 
      }
      if (isNaN(limit) || limit < 1) { 
        res.status(400).json({ success: false, message: 'Invalid limit number.' }); 
        return; 
      }

      let query: any = {};
      const { name, mcNumber, dotNumber, searchTerm } = req.query;

      const specificFilters: any = {};
      if (name) specificFilters.name = { $regex: name, $options: 'i' };
      if (mcNumber) specificFilters.mcNumber = { $regex: mcNumber, $options: 'i' };
      if (dotNumber) specificFilters.dotNumber = { $regex: dotNumber, $options: 'i' };

      if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim() !== '') {
        const searchStr = searchTerm.trim();
        const searchRegex = { $regex: searchStr, $options: 'i' };
        const searchOrConditions: any[] = [
          { name: searchRegex }, { mcNumber: searchRegex }, { dotNumber: searchRegex },
          { 'contact.name': searchRegex }, { 'contact.email': searchRegex }, { 'contact.phone': searchRegex },
          { 'address.street': searchRegex }, { 'address.city': searchRegex }, { 'address.state': searchRegex }, { 'address.zip': searchRegex },
          { 'saferData.saferRating': searchRegex },
        ];
        query = Object.keys(specificFilters).length > 0 ? { $and: [specificFilters, { $or: searchOrConditions }] } : { $or: searchOrConditions };
        logger.info('Added global search conditions for carriers with searchTerm:', searchStr);
      } else {
        query = specificFilters;
      }

      logger.info('Final Mongoose query for getCarriers:', JSON.stringify(query));

      const carriers = await Carrier.find(query)
        .sort(sortOptions)
        .limit(limit)
        .skip((page - 1) * limit)
        .lean();

      const total = await Carrier.countDocuments(query);
      logger.info(`Found ${carriers.length} carriers, total matching query: ${total}.`);

      res.status(200).json({
        success: true,
        message: "Carriers fetched successfully",
        data: { carriers, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, },
      });
    } catch (error: any) {
      logger.error('CRITICAL ERROR in getCarriers:', { message: error.message, name: error.name, stack: error.stack, query: req.query, errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error), 2) });
      res.status(500).json({ success: false, message: 'Error fetching carriers', errorDetails: error.message });
    }
  }

  async createCarrier(req: Request, res: Response): Promise<void> {
    logger.info('Attempting to create carrier with body:', req.body);
    try {
      const { name, mcNumber, dotNumber, contact, address } = req.body;
      const missing = [];

      if (!name) missing.push("name");
      if (!mcNumber) missing.push("mcNumber");
      if (!dotNumber) missing.push("dotNumber");
      if (!contact) missing.push("contact object");
      else {
        if (!contact.name) missing.push("contact name");
        if (!contact.email) missing.push("contact email");
        if (!contact.phone) missing.push("contact phone");
      }
      if (!address) missing.push("address object");
      else {
        if (!address.street) missing.push("address street");
        if (!address.city) missing.push("address city");
        if (!address.state) missing.push("address state");
        if (!address.zip) missing.push("address zip");
      }

      if (missing.length > 0) {
        const missingFieldsMsg = `Missing required fields for carrier. Ensure ${missing.join(', ')} are provided.`;
        logger.warn(`Carrier Create Validation: ${missingFieldsMsg}`, { body: req.body });
        res.status(400).json({ success: false, message: missingFieldsMsg });
        return;
      }

      const newCarrier = new Carrier(req.body);
      await newCarrier.save();
      logger.info('Carrier created successfully', { carrierId: newCarrier._id });

      if (newCarrier.dotNumber) {
        try {
            logger.info(`Fetching SAFER data for new carrier DOT: ${newCarrier.dotNumber}`);
            const saferData = await saferService.getCarrierSafetyData(newCarrier.dotNumber);
            if (saferData) {
                newCarrier.saferData = { ...(newCarrier.saferData || {}), ...saferData, lastUpdated: new Date() };
                await newCarrier.save();
                logger.info(`SAFER data updated for new carrier ${newCarrier.name}`);
            }
        } catch (saferError: any) { logger.warn(`Could not fetch SAFER data for new carrier ${newCarrier.name}: ${saferError.message}`); }
      }
      res.status(201).json({ success: true, message: 'Carrier created successfully', data: newCarrier });
    } catch (error: any) {
      logger.error('CRITICAL ERROR in createCarrier:', { message: error.message, name: error.name, requestBody: req.body });
      if (error.name === 'ValidationError') res.status(400).json({ success: false, message: 'Validation Error', errors: error.errors });
      else if (error.code === 11000) res.status(409).json({ success: false, message: 'Duplicate MC or DOT.', errorDetails: error.keyValue });
      else res.status(500).json({ success: false, message: 'Error creating carrier', errorDetails: error.message });
    }
  }

  async getCarrierById(req: Request, res: Response): Promise<void> {
    logger.info(`Attempting to get carrier by ID: ${req.params.id}`);
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) { 
            res.status(400).json({ success: false, message: 'Invalid carrier ID format.'}); 
            return; 
        }
        const carrier = await Carrier.findById(id).lean();
        if (!carrier) { 
            res.status(404).json({ success: false, message: 'Carrier not found.' }); 
            return; 
        }
        res.status(200).json({ success: true, data: carrier });
    } catch (error: any) {
        logger.error('Error in getCarrierById:', { message: error.message, stack: error.stack, id: req.params.id });
        res.status(500).json({ success: false, message: 'Error fetching carrier details.', errorDetails: error.message });
    }
  }

  async updateSaferDataForCarrier(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info(`Attempting to update SAFER data for carrier ID: ${id}`);
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) { 
        res.status(400).json({ success: false, message: 'Invalid carrier ID format.' }); 
        return; 
      }
      const carrier = await Carrier.findById(id);
      if (!carrier) { 
        res.status(404).json({ success: false, message: 'Carrier not found.' }); 
        return; 
      }
      
      if (!carrier.dotNumber) { 
        logger.warn(`Carrier ${carrier.name} (ID: ${id}) does not have a DOT number to look up.`);
        res.status(400).json({ success: false, message: 'Carrier does not have a DOT number.' }); 
        return; 
      }

      // Call the service with the DOT number
      const safetyData = await saferService.getCarrierSafetyData(carrier.dotNumber);

      if (safetyData) {
        carrier.saferData = { ...(carrier.saferData || {}), ...safetyData, lastUpdated: new Date() };
        
        // Also update the main carrier record with the authoritative data from SAFER
        carrier.name = safetyData.legalName || carrier.name;
        if(safetyData.dotNumber) carrier.dotNumber = safetyData.dotNumber;
        
        // The API returns MC as a string like "MC-123456", we only want the number
        const mcNumberFromApi = safetyData.mcNumber?.replace('MC-', '');
        if(mcNumberFromApi) carrier.mcNumber = mcNumberFromApi;

        if (safetyData.address) {
            carrier.address.street = safetyData.address.street || carrier.address.street;
            carrier.address.city = safetyData.address.city || carrier.address.city;
            carrier.address.state = safetyData.address.state || carrier.address.state;
            carrier.address.zip = safetyData.address.zip || carrier.address.zip;
        }

        await carrier.save();
        logger.info(`SAFER data updated for carrier: ${carrier.name}`);
        res.status(200).json({ success: true, message: 'SAFER data updated successfully.', data: carrier });
      } else {
        res.status(404).json({ success: false, message: `No SAFER data found for DOT: ${carrier.dotNumber}` });
      }
    } catch (error: any) {
      logger.error('CRITICAL ERROR in updateSaferDataForCarrier:', { message: error.message, carrierId: id });
      res.status(500).json({ success: false, message: error.message || 'Error updating SAFER data.' });
    }
  }

  async updateCarrier(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info(`Attempting to update carrier ID: ${id} with body:`, req.body);
    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid carrier ID format.' });
        return;
    }
    try {
        const updateData = req.body;
        
        const updatedCarrier = await Carrier.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true }).lean();

        if (!updatedCarrier) {
            res.status(404).json({ success: false, message: 'Carrier not found.' });
            return;
        }
        logger.info('Carrier updated successfully', { carrierId: updatedCarrier._id });
        res.status(200).json({ success: true, message: 'Carrier updated successfully.', data: updatedCarrier });

    } catch (error: any) {
        logger.error('CRITICAL ERROR in updateCarrier:', { message: error.message, name: error.name, carrierId: id, requestBody: req.body });
        if (error.name === 'ValidationError') res.status(400).json({ success: false, message: 'Validation Error', errors: error.errors });
        else if (error.code === 11000) res.status(409).json({ success: false, message: 'Duplicate MC or DOT number.', errorDetails: error.keyValue });
        else res.status(500).json({ success: false, message: 'Error updating carrier.', errorDetails: error.message });
    }
  }

  async deleteCarrier(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info(`Attempting to delete carrier with ID: ${id}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid carrier ID format.' });
      return;
    }
    try {
      const activeShipmentsCount = await Shipment.countDocuments({
        carrier: new mongoose.Types.ObjectId(id),
        status: { $nin: ['quote', 'cancelled', 'delivered', 'paid'] }
      });

      if (activeShipmentsCount > 0) {
        logger.warn(`Attempt to delete carrier ID: ${id} with ${activeShipmentsCount} active shipments.`);
        res.status(409).json({ // Removed 'return' from here
          success: false,
          message: `Cannot delete carrier. It is associated with ${activeShipmentsCount} active shipment(s). Please reassign or cancel these shipments first.`
        });
        return; // Added 'return' here to ensure function exits
      }
      const carrier = await Carrier.findByIdAndDelete(id);
      if (!carrier) {
        res.status(404).json({ success: false, message: 'Carrier not found.' });
        return;
      }
      logger.info(`Carrier with ID: ${id} deleted successfully.`);
      res.status(200).json({ success: true, message: 'Carrier deleted successfully.' });
    } catch (error: any) {
      logger.error('Error deleting carrier:', { message: error.message, stack: error.stack, id });
      res.status(500).json({ success: false, message: 'Error deleting carrier.', errorDetails: error.message });
    }
  }
}