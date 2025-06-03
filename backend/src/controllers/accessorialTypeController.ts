// File: backend/src/controllers/accessorialTypeController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AccessorialType, IAccessorialType } from '../models/AccessorialType';
import { logger } from '../utils/logger';

export class AccessorialTypeController {
  // CREATE
  async createAccessorialType(req: Request, res: Response): Promise<void> {
    logger.info('Attempting to create accessorial type:', req.body);
    try {
      const { name, /* code, */ appliesToModes, category } = req.body; // Code is now optional
      if (!name || !appliesToModes || !Array.isArray(appliesToModes) || appliesToModes.length === 0 || !category) {
        res.status(400).json({ success: false, message: 'Name, category, and at least one applicable mode are required.' });
        return;
      }
      // Consider more validation for appliesToModes against known enum values

      const newAccessorialType = new AccessorialType(req.body);
      await newAccessorialType.save();
      logger.info('Accessorial type created successfully:', newAccessorialType._id);
      res.status(201).json({ success: true, data: newAccessorialType, message: 'Accessorial type created.' });
    } catch (error: any) {
      logger.error('Error creating accessorial type:', { message: error.message, body: req.body });
      if (error.code === 11000) { // Duplicate key
        res.status(409).json({ success: false, message: 'Accessorial type with this name already exists.' });
      } else if (error.name === 'ValidationError') {
        res.status(400).json({ success: false, message: error.message, errors: error.errors });
      } else {
        res.status(500).json({ success: false, message: 'Error creating accessorial type.' });
      }
    }
  }

  // READ ALL (with simple pagination for settings management)
  async getAccessorialTypes(req: Request, res: Response): Promise<void> {
    logger.info('Fetching all accessorial types for management. Query:', req.query);
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 25; // Default limit for management
      const sort = (req.query.sort as string) || 'category name'; // Default sort

      const query: any = {};
      if (req.query.isActive) query.isActive = req.query.isActive === 'true';
      if (req.query.category) query.category = req.query.category as string;


      const accessorialTypes = await AccessorialType.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      
      const total = await AccessorialType.countDocuments(query);

      res.status(200).json({ 
        success: true, 
        data: {
            accessorialTypes,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        }
      });
    } catch (error: any) {
      logger.error('Error fetching accessorial types:', { message: error.message });
      res.status(500).json({ success: false, message: 'Error fetching accessorial types.' });
    }
  }

  // READ ONE
  async getAccessorialTypeById(req: Request, res: Response): Promise<void> {
    logger.info(`Fetching accessorial type by ID: ${req.params.id}`);
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ success: false, message: 'Invalid ID format.' });
        return;
      }
      const accessorialType = await AccessorialType.findById(req.params.id).lean();
      if (!accessorialType) {
        res.status(404).json({ success: false, message: 'Accessorial type not found.' });
        return;
      }
      res.status(200).json({ success: true, data: accessorialType });
    } catch (error: any) {
      logger.error('Error fetching accessorial type by ID:', { message: error.message, id: req.params.id });
      res.status(500).json({ success: false, message: 'Error fetching accessorial type.' });
    }
  }

  // UPDATE
  async updateAccessorialType(req: Request, res: Response): Promise<void> {
    logger.info(`Updating accessorial type ID: ${req.params.id}`, { body: req.body });
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ success: false, message: 'Invalid ID format.' });
        return;
      }
      const { name, code, appliesToModes, category } = req.body;
       if (!name && !code && !appliesToModes && !category) { // Check if at least one editable field is present
        res.status(400).json({ success: false, message: 'No update data provided or missing key fields (name, code, category, appliesToModes).' });
        return;
      }


      const updatedAccessorialType = await AccessorialType.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).lean();

      if (!updatedAccessorialType) {
        res.status(404).json({ success: false, message: 'Accessorial type not found.' });
        return;
      }
      logger.info('Accessorial type updated successfully:', updatedAccessorialType._id);
      res.status(200).json({ success: true, data: updatedAccessorialType, message: 'Accessorial type updated.' });
    } catch (error: any) {
      logger.error('Error updating accessorial type:', { message: error.message, id: req.params.id, body: req.body });
      if (error.code === 11000) {
        res.status(409).json({ success: false, message: 'Accessorial type with this name or code already exists.' });
      } else if (error.name === 'ValidationError') {
        res.status(400).json({ success: false, message: error.message, errors: error.errors });
      } else {
        res.status(500).json({ success: false, message: 'Error updating accessorial type.' });
      }
    }
  }

  // DELETE
  async deleteAccessorialType(req: Request, res: Response): Promise<void> {
    logger.info(`Deleting accessorial type ID: ${req.params.id}`);
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ success: false, message: 'Invalid ID format.' });
        return;
      }
      // TODO: Check if this accessorial type is in use in any Shipment.accessorials
      // This would require querying the Shipment model. For now, direct delete.
      // const shipmentsUsingAccessorial = await Shipment.countDocuments({ 'accessorials.accessorialTypeId': req.params.id });
      // if (shipmentsUsingAccessorial > 0) {
      //   return res.status(409).json({ success: false, message: `Cannot delete. Accessorial type is used in ${shipmentsUsingAccessorial} shipment(s).` });
      // }

      const deletedAccessorialType = await AccessorialType.findByIdAndDelete(req.params.id);
      if (!deletedAccessorialType) {
        res.status(404).json({ success: false, message: 'Accessorial type not found.' });
        return;
      }
      logger.info('Accessorial type deleted successfully:', req.params.id);
      res.status(200).json({ success: true, message: 'Accessorial type deleted.' });
    } catch (error: any) {
      logger.error('Error deleting accessorial type:', { message: error.message, id: req.params.id });
      res.status(500).json({ success: false, message: 'Error deleting accessorial type.' });
    }
  }
}