// File: backend/src/controllers/settingsController.ts
import { Request, Response } from 'express';
import { ApplicationSettings, IQuoteFormSettings } from '../models/ApplicationSettings';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

const defaultQuoteFormSettings: IQuoteFormSettings = {
    requiredFields: ['shipper', 'modeOfTransport', 'equipmentType', 'originCity', 'originState', 'destinationCity', 'destinationState', 'scheduledPickupDate', 'commodityDescription', 'customerRate'],
    quoteNumberPrefix: 'QT-',
    quoteNumberNextSequence: 1001,
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
        return;
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

  async updateQuoteFormSettings(req: Request, res: Response): Promise<void> { // Standard Request
    logger.info('Updating quote form settings with body:', req.body);
    try {
      const settingsData = req.body as IQuoteFormSettings;

      if (!settingsData || !Array.isArray(settingsData.requiredFields) || typeof settingsData.quoteNumberPrefix !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid settings data provided.' });
        return;
      }
      
      const userId = req.user?._id; // This should now work due to global augmentation
      let lastUpdatedBy;
      if (userId && mongoose.Types.ObjectId.isValid(userId.toString())) {
        lastUpdatedBy = new mongoose.Types.ObjectId(userId.toString());
      } else {
        const adminUser = await User.findOne({ email: 'admin@example.com' }).select('_id').lean();
        if (adminUser) lastUpdatedBy = adminUser._id;
      }

      // ... rest of method, ensuring no 'return res.status().json()'
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
}