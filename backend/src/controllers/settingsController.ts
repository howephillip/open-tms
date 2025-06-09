import { Request, Response } from 'express';
import { ApplicationSettings, IQuoteFormSettings, IShipmentFormSettings } from '../models/ApplicationSettings';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

const defaultQuoteFormSettings: IQuoteFormSettings = {
    requiredFields: ['shipper', 'modeOfTransport', 'equipmentType', 'originCity', 'originState', 'destinationCity', 'destinationState', 'scheduledPickupDate', 'commodityDescription', 'customerRate'],
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

export class SettingsController {

  async getQuoteFormSettings(req: Request, res: Response): Promise<void> {
    logger.info('Fetching quote form settings');
    try {
      let settingsDoc = await ApplicationSettings.findOne({ key: 'quoteForm' }).lean();
      
      if (!settingsDoc) {
        logger.info('No quote form settings found in DB, returning defaults.');
        res.status(200).json({
          success: true,
          message: 'Default quote form settings fetched.',
          data: defaultQuoteFormSettings,
        });
        return; // --- THIS IS THE FIX ---
      }

      res.status(200).json({
        success: true,
        message: 'Quote form settings fetched successfully.',
        data: settingsDoc.settings as IQuoteFormSettings,
      });
    } catch (error: any) {
      logger.error('Error fetching quote form settings:', { message: error.message, stack: error.stack });
      res.status(500).json({ success: false, message: 'Error fetching settings', errorDetails: error.message });
    }
  }

  async updateQuoteFormSettings(req: Request, res: Response): Promise<void> {
    logger.info('Updating quote form settings with body:', req.body);
    try {
      const settingsData = req.body as IQuoteFormSettings;

      if (!settingsData || !Array.isArray(settingsData.requiredFields) || typeof settingsData.quoteNumberPrefix !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid settings data provided.' });
        return;
      }
      
      const userId = (req as any).user?._id;
      let lastUpdatedBy;
      if (userId && mongoose.Types.ObjectId.isValid(userId.toString())) {
        lastUpdatedBy = new mongoose.Types.ObjectId(userId.toString());
      }

      const updatedSettingsDoc = await ApplicationSettings.findOneAndUpdate(
        { key: 'quoteForm' },
        { $set: { settings: settingsData, lastUpdatedBy: lastUpdatedBy } },
        { new: true, upsert: true, runValidators: true }
      ).lean();

      if (!updatedSettingsDoc) {
        logger.error('Failed to update/create quote form settings.');
        res.status(500).json({ success: false, message: 'Error saving settings.' });
        return;
      }
      
      logger.info('Quote form settings updated successfully.');
      res.status(200).json({
        success: true,
        message: 'Quote form settings updated successfully.',
        data: updatedSettingsDoc.settings as IQuoteFormSettings,
      });
    } catch (error: any) {
      logger.error('Error updating quote form settings:', { message: error.message, stack: error.stack });
      if (error.name === 'ValidationError') {
        res.status(400).json({ success: false, message: 'Validation error updating settings.', errors: error.errors });
      } else {
        res.status(500).json({ success: false, message: 'Error updating settings', errorDetails: error.message });
      }
    }
  }

  async getShipmentFormSettings(req: Request, res: Response): Promise<void> {
    logger.info('Fetching shipment form settings');
    try {
      let settingsDoc = await ApplicationSettings.findOne({ key: 'shipmentForm' }).lean();
      
      if (!settingsDoc) {
        logger.info('No shipment form settings found in DB, returning defaults.');
        res.status(200).json({ success: true, data: defaultShipmentFormSettings });
        return;
      }

      res.status(200).json({ success: true, data: settingsDoc.settings as IShipmentFormSettings });
    } catch (error: any) {
      logger.error('Error fetching shipment form settings:', { message: error.message });
      res.status(500).json({ success: false, message: 'Error fetching settings' });
    }
  }

  async updateShipmentFormSettings(req: Request, res: Response): Promise<void> {
    logger.info('Updating shipment form settings with body:', req.body);
    try {
      const settingsData = req.body as IShipmentFormSettings;

      if (!settingsData || !Array.isArray(settingsData.requiredFields)) {
        res.status(400).json({ success: false, message: 'Invalid settings data provided.' });
        return;
      }
      
      const userId = (req as any).user?._id;
      let lastUpdatedBy;
      if (userId) { lastUpdatedBy = new mongoose.Types.ObjectId(userId.toString()); }
      
      const updatedSettingsDoc = await ApplicationSettings.findOneAndUpdate(
        { key: 'shipmentForm' },
        { $set: { settings: settingsData, lastUpdatedBy: lastUpdatedBy } },
        { new: true, upsert: true, runValidators: true }
      ).lean();

      res.status(200).json({ success: true, data: updatedSettingsDoc.settings as IShipmentFormSettings });
    } catch (error: any) {
      logger.error('Error updating shipment form settings:', { message: error.message });
      res.status(500).json({ success: false, message: 'Error updating settings' });
    }
  }
}