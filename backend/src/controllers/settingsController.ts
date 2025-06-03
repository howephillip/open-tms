// File: backend/src/controllers/settingsController.ts
import { Request, Response } from 'express';
import { ApplicationSettings, IQuoteFormSettings } from '../models/ApplicationSettings';
import { User } from '../models/User'; // If you want to track who updated settings
import { logger } from '../utils/logger';
import mongoose from 'mongoose';


// Default settings if none are found in the DB
const defaultQuoteFormSettings: IQuoteFormSettings = {
    requiredFields: ['shipper', 'modeOfTransport', 'equipmentType', 'originCity', 'originState', 'destinationCity', 'destinationState', 'scheduledPickupDate', 'commodityDescription', 'customerRate'],
    quoteNumberPrefix: 'QT-',
    quoteNumberNextSequence: 1001,
};

export class SettingsController {
  // --- GET Quote Form Settings ---
  async getQuoteFormSettings(req: Request, res: Response): Promise<void> {
    logger.info('Fetching quote form settings');
    try {
      let settingsDoc = await ApplicationSettings.findOne({ key: 'quoteForm' }).lean();
      
      if (!settingsDoc) {
        logger.info('No quote form settings found in DB, returning defaults.');
        // Optionally, create the default settings in the DB if they don't exist
        // await ApplicationSettings.create({ key: 'quoteForm', settings: defaultQuoteFormSettings });
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
        data: settingsDoc.settings as IQuoteFormSettings, // Cast to specific type
      });
    } catch (error: any) {
      logger.error('Error fetching quote form settings:', { message: error.message, stack: error.stack });
      res.status(500).json({ success: false, message: 'Error fetching settings', errorDetails: error.message });
    }
  }

  // --- UPDATE Quote Form Settings ---
  async updateQuoteFormSettings(req: Request, res: Response): Promise<void> {
    logger.info('Updating quote form settings with body:', req.body);
    try {
      const settingsData = req.body as IQuoteFormSettings; // Expecting the full settings object

      // Basic validation for the incoming settings data
      if (!settingsData || !Array.isArray(settingsData.requiredFields) || typeof settingsData.quoteNumberPrefix !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid settings data provided.' });
        return;
      }
      
      // Assuming req.user is populated by auth middleware for lastUpdatedBy
      const userId = (req.user as any)?._id; 
      let lastUpdatedBy;
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        lastUpdatedBy = new mongoose.Types.ObjectId(userId);
      } else {
         // Fallback or error if user context is mandatory for updates
        const adminUser = await User.findOne({ email: 'admin@example.com' }).select('_id').lean();
        if (adminUser) lastUpdatedBy = adminUser._id;
      }


      const updatedSettingsDoc = await ApplicationSettings.findOneAndUpdate(
        { key: 'quoteForm' },
        { $set: { settings: settingsData, lastUpdatedBy: lastUpdatedBy } },
        { new: true, upsert: true, runValidators: true } // Upsert creates if not found
      ).lean();

      if (!updatedSettingsDoc) {
        // Should not happen with upsert: true, but as a safeguard
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