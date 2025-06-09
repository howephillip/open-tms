import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { EquipmentType, IEquipmentType } from '../models/EquipmentType';
import { logger } from '../utils/logger';

// This controller is a near-copy of AccessorialTypeController, adapted for EquipmentType
export class EquipmentTypeController {
  // CREATE
  async createEquipmentType(req: Request, res: Response): Promise<void> {
    logger.info('Attempting to create equipment type:', req.body);
    try {
      const newEquipmentType = new EquipmentType(req.body);
      await newEquipmentType.save();
      logger.info('Equipment type created successfully:', newEquipmentType._id);
      res.status(201).json({ success: true, data: newEquipmentType, message: 'Equipment type created.' });
    } catch (error: any) {
      logger.error('Error creating equipment type:', { message: error.message, body: req.body });
      if (error.code === 11000) {
        res.status(409).json({ success: false, message: 'An equipment type with this name or code already exists.' });
      } else if (error.name === 'ValidationError') {
        res.status(400).json({ success: false, message: error.message, errors: error.errors });
      } else {
        res.status(500).json({ success: false, message: 'Error creating equipment type.' });
      }
    }
  }

  // READ ALL
  async getEquipmentTypes(req: Request, res: Response): Promise<void> {
    logger.info('Fetching all equipment types for management. Query:', req.query);
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const sort = (req.query.sort as string) || 'category name';
      const equipmentTypes = await EquipmentType.find().sort(sort).limit(limit).lean();
      res.status(200).json({ success: true, data: equipmentTypes });
    } catch (error: any) {
      logger.error('Error fetching equipment types:', { message: error.message });
      res.status(500).json({ success: false, message: 'Error fetching equipment types.' });
    }
  }

  // READ ONE
  async getEquipmentTypeById(req: Request, res: Response): Promise<void> {
    logger.info(`Fetching equipment type by ID: ${req.params.id}`);
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ success: false, message: 'Invalid ID format.' }); return;
      }
      const equipmentType = await EquipmentType.findById(req.params.id).lean();
      if (!equipmentType) {
        res.status(404).json({ success: false, message: 'Equipment type not found.' }); return;
      }
      res.status(200).json({ success: true, data: equipmentType });
    } catch (error: any) {
      logger.error('Error fetching equipment type by ID:', { message: error.message, id: req.params.id });
      res.status(500).json({ success: false, message: 'Error fetching equipment type.' });
    }
  }

  // UPDATE
  async updateEquipmentType(req: Request, res: Response): Promise<void> {
    logger.info(`Updating equipment type ID: ${req.params.id}`, { body: req.body });
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ success: false, message: 'Invalid ID format.' }); return;
      }
      const updatedEquipmentType = await EquipmentType.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).lean();

      if (!updatedEquipmentType) {
        res.status(404).json({ success: false, message: 'Equipment type not found.' }); return;
      }
      logger.info('Equipment type updated successfully:', updatedEquipmentType._id);
      res.status(200).json({ success: true, data: updatedEquipmentType, message: 'Equipment type updated.' });
    } catch (error: any) {
      logger.error('Error updating equipment type:', { message: error.message, id: req.params.id });
      if (error.code === 11000) {
        res.status(409).json({ success: false, message: 'An equipment type with this name or code already exists.' });
      } else if (error.name === 'ValidationError') {
        res.status(400).json({ success: false, message: error.message, errors: error.errors });
      } else {
        res.status(500).json({ success: false, message: 'Error updating equipment type.' });
      }
    }
  }

  // DELETE
  async deleteEquipmentType(req: Request, res: Response): Promise<void> {
    logger.info(`Deleting equipment type ID: ${req.params.id}`);
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ success: false, message: 'Invalid ID format.' }); return;
      }
      // TODO: Check if this equipment type is in use on any Shipments before deleting.
      const deletedEquipmentType = await EquipmentType.findByIdAndDelete(req.params.id);
      if (!deletedEquipmentType) {
        res.status(404).json({ success: false, message: 'Equipment type not found.' }); return;
      }
      logger.info('Equipment type deleted successfully:', req.params.id);
      res.status(200).json({ success: true, message: 'Equipment type deleted.' });
    } catch (error: any) {
      logger.error('Error deleting equipment type:', { message: error.message, id: req.params.id });
      res.status(500).json({ success: false, message: 'Error deleting equipment type.' });
    }
  }
}