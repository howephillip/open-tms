// File: backend/src/controllers/shipperController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Shipper, IShipper } from '../models/Shipper';
import { Shipment } from '../models/Shipment'; // Import Shipment to check for relations
import { logger } from '../utils/logger';

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

export class ShipperController {
  async getShippers(req: Request, res: Response): Promise<void> {
    logger.info('Attempting to get shippers. Query params:', req.query);
    try {
      const pageQuery = req.query.page as string | undefined;
      const limitQuery = req.query.limit as string | undefined;
      const sortQueryString = req.query.sort as string | undefined || 'name';
      const sortOptions = parseSortQuery(sortQueryString);

      const page = pageQuery ? parseInt(pageQuery, 10) : 1;
      const limit = limitQuery ? parseInt(limitQuery, 10) : 100;

      if (isNaN(page) || page < 1) { res.status(400).json({ success: false, message: 'Invalid page number.' }); return; }
      if (isNaN(limit) || limit < 1) { res.status(400).json({ success: false, message: 'Invalid limit number.' }); return; }

      let query: any = {};
      const { name, industry, searchTerm } = req.query;

      const specificFilters: any = {};
      if (name) specificFilters.name = { $regex: name, $options: 'i' };
      if (industry) specificFilters.industry = { $regex: industry, $options: 'i' };

      if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim() !== '') {
        const searchStr = searchTerm.trim();
        const searchRegex = { $regex: searchStr, $options: 'i' };
        const searchOrConditions: any[] = [
          { name: searchRegex }, { industry: searchRegex },
          { 'contact.name': searchRegex }, { 'contact.email': searchRegex }, { 'contact.phone': searchRegex },
          { 'address.street': searchRegex }, { 'address.city': searchRegex }, { 'address.state': searchRegex }, { 'address.zip': searchRegex },
          { 'billingInfo.invoiceEmail': searchRegex },
        ];
        query = Object.keys(specificFilters).length > 0 ? { $and: [specificFilters, { $or: searchOrConditions }] } : { $or: searchOrConditions };
        logger.info('Added global search conditions for shippers with searchTerm:', searchStr);
      } else {
        query = specificFilters;
      }
      
      logger.info('Final Mongoose query for getShippers:', JSON.stringify(query));

      const shippers = await Shipper.find(query)
        .sort(sortOptions)
        .limit(limit)
        .skip((page - 1) * limit)
        .lean();

      const total = await Shipper.countDocuments(query);
      logger.info(`Found ${shippers.length} shippers, total matching query: ${total}.`);

      res.status(200).json({
        success: true,
        message: "Shippers fetched successfully",
        data: { shippers, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, },
      });
    } catch (error: any) {
      logger.error('CRITICAL ERROR in getShippers:', { message: error.message, name: error.name, stack: error.stack, query: req.query, errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error), 2) });
      res.status(500).json({ success: false, message: 'Error fetching shippers', errorDetails: error.message });
    }
  }

  async createShipper(req: Request, res: Response): Promise<void> {
    logger.info('Attempting to create shipper with body:', req.body);
    try {
      const { name, address, contact, billingInfo, industry, preferredEquipment } = req.body;
      const missing = [];

      if (!name) missing.push("name");
      if (!industry) missing.push("industry");
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
      if (!billingInfo) missing.push("billingInfo object");
      else {
        if (!billingInfo.invoiceEmail) missing.push("billing invoice email");
        if (!billingInfo.paymentTerms) missing.push("billing payment terms"); 
        // creditLimit can be 0, so check for undefined if it's strictly required to be passed
        // if (billingInfo.creditLimit === undefined) missing.push("billing credit limit");
      }

      if (missing.length > 0) {
        const missingFieldsMsg = `Missing required fields. Ensure ${missing.join(', ')} are provided.`;
        logger.warn(`Shipper Create Validation: ${missingFieldsMsg}`, { body: req.body });
        res.status(400).json({ success: false, message: missingFieldsMsg });
        return;
      }

      const newShipperData: Partial<IShipper> = {
        name, industry, contact, address, billingInfo,
        preferredEquipment: Array.isArray(preferredEquipment) ? preferredEquipment : (preferredEquipment ? String(preferredEquipment).split(',').map(e=>e.trim()).filter(e=>e) : [])
      };
      if (billingInfo && billingInfo.creditLimit !== undefined) {
        newShipperData.billingInfo!.creditLimit = parseFloat(billingInfo.creditLimit) || 0;
      }


      const newShipper = new Shipper(newShipperData);
      await newShipper.save();
      logger.info('Shipper created successfully', { shipperId: newShipper._id });

      res.status(201).json({ success: true, message: 'Shipper created successfully', data: newShipper });
    } catch (error: any) {
      logger.error('CRITICAL ERROR in createShipper:', { message: error.message, name: error.name, requestBody: req.body }); // Removed stack for brevity in this case
       if (error.name === 'ValidationError') res.status(400).json({ success: false, message: 'Validation Error creating shipper', errors: error.errors });
      else if (error.code === 11000) res.status(409).json({ success: false, message: 'A shipper with similar unique fields (e.g., name) might already exist.', errorDetails: error.keyValue });
       else res.status(500).json({ success: false, message: 'Error creating shipper', errorDetails: error.message });
    }
  }

  async getShipperById(req: Request, res: Response): Promise<void> {
    logger.info(`Attempting to get shipper by ID: ${req.params.id}`);
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) { res.status(400).json({ success: false, message: 'Invalid shipper ID format.'}); return; }
        const shipper = await Shipper.findById(id).lean();
        if (!shipper) { res.status(404).json({ success: false, message: 'Shipper not found.' }); return; }
        res.status(200).json({ success: true, data: shipper });
    } catch (error: any) {
        logger.error('Error in getShipperById:', { message: error.message, stack: error.stack, id: req.params.id });
        res.status(500).json({ success: false, message: 'Error fetching shipper details.', errorDetails: error.message });
    }
  }
  
  async updateShipper(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info(`Attempting to update shipper ID: ${id} with body:`, req.body);
    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid shipper ID format.' });
        return;
    }
    try {
        const updateData = { ...req.body };
        if (updateData.preferredEquipment && typeof updateData.preferredEquipment === 'string') {
            updateData.preferredEquipment = updateData.preferredEquipment.split(',').map((e:string) => e.trim()).filter((e:string) => e);
        }
        if (updateData.billingInfo && updateData.billingInfo.creditLimit !== undefined) {
            updateData.billingInfo.creditLimit = parseFloat(updateData.billingInfo.creditLimit) || 0;
        }

        const updatedShipper = await Shipper.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true }).lean();

        if (!updatedShipper) {
            res.status(404).json({ success: false, message: 'Shipper not found.' });
            return;
        }
        logger.info('Shipper updated successfully', { shipperId: updatedShipper._id });
        res.status(200).json({ success: true, message: 'Shipper updated successfully.', data: updatedShipper });

    } catch (error: any) {
        logger.error('CRITICAL ERROR in updateShipper:', { message: error.message, name: error.name, shipperId: id, requestBody: req.body });
        if (error.name === 'ValidationError') res.status(400).json({ success: false, message: 'Validation Error', errors: error.errors });
        else if (error.code === 11000) res.status(409).json({ success: false, message: 'Duplicate name or other unique field.', errorDetails: error.keyValue });
        else res.status(500).json({ success: false, message: 'Error updating shipper.', errorDetails: error.message });
    }
  }

  async deleteShipper(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info(`Attempting to delete shipper with ID: ${id}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid shipper ID format.' });
      return;
    }
    try {
      const activeShipmentsCount = await Shipment.countDocuments({
        shipper: new mongoose.Types.ObjectId(id),
        status: { $nin: ['quote', 'cancelled', 'delivered', 'paid'] }
      });

      if (activeShipmentsCount > 0) {
        logger.warn(`Attempt to delete shipper ID: ${id} with ${activeShipmentsCount} active shipments.`);
        return res.status(409).json({
          success: false,
          message: `Cannot delete shipper. It is associated with ${activeShipmentsCount} active shipment(s). Please reassign or cancel these shipments first.`
        });
      }
      const shipper = await Shipper.findByIdAndDelete(id);
      if (!shipper) {
        res.status(404).json({ success: false, message: 'Shipper not found.' });
        return;
      }
      logger.info(`Shipper with ID: ${id} deleted successfully.`);
      res.status(200).json({ success: true, message: 'Shipper deleted successfully.' });
    } catch (error: any) {
      logger.error('Error deleting shipper:', { message: error.message, stack: error.stack, id });
      res.status(500).json({ success: false, message: 'Error deleting shipper.', errorDetails: error.message });
    }
  }
}