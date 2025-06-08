"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsController = void 0;
const ApplicationSettings_1 = require("../models/ApplicationSettings");
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
const mongoose_1 = __importDefault(require("mongoose"));
const defaultQuoteFormSettings = {
    requiredFields: ['shipper', 'modeOfTransport', 'equipmentType', 'originCity', 'originState', 'destinationCity', 'destinationState', 'scheduledPickupDate', 'commodityDescription', 'customerRate'],
    quoteNumberPrefix: 'QT-',
    quoteNumberNextSequence: 1001,
};
class SettingsController {
    async getQuoteFormSettings(req, res) {
        logger_1.logger.info('Fetching quote form settings');
        try {
            let settingsDoc = await ApplicationSettings_1.ApplicationSettings.findOne({ key: 'quoteForm' }).lean();
            if (!settingsDoc) {
                logger_1.logger.info('No quote form settings found in DB, returning defaults.');
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
                data: settingsDoc.settings,
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching quote form settings:', { message: error.message, stack: error.stack });
            res.status(500).json({ success: false, message: 'Error fetching settings', errorDetails: error.message });
        }
    }
    async updateQuoteFormSettings(req, res) {
        logger_1.logger.info('Updating quote form settings with body:', req.body);
        try {
            const settingsData = req.body;
            if (!settingsData || !Array.isArray(settingsData.requiredFields) || typeof settingsData.quoteNumberPrefix !== 'string') {
                res.status(400).json({ success: false, message: 'Invalid settings data provided.' });
                return;
            }
            const userId = req.user?._id; // This should now work due to global augmentation
            let lastUpdatedBy;
            if (userId && mongoose_1.default.Types.ObjectId.isValid(userId.toString())) {
                lastUpdatedBy = new mongoose_1.default.Types.ObjectId(userId.toString());
            }
            else {
                const adminUser = await User_1.User.findOne({ email: 'admin@example.com' }).select('_id').lean();
                if (adminUser)
                    lastUpdatedBy = adminUser._id;
            }
            // ... rest of method, ensuring no 'return res.status().json()'
            const updatedSettingsDoc = await ApplicationSettings_1.ApplicationSettings.findOneAndUpdate({ key: 'quoteForm' }, { $set: { settings: settingsData, lastUpdatedBy: lastUpdatedBy } }, { new: true, upsert: true, runValidators: true }).lean();
            if (!updatedSettingsDoc) {
                logger_1.logger.error('Failed to update/create quote form settings.');
                res.status(500).json({ success: false, message: 'Error saving settings.' });
                return;
            }
            logger_1.logger.info('Quote form settings updated successfully.');
            res.status(200).json({
                success: true,
                message: 'Quote form settings updated successfully.',
                data: updatedSettingsDoc.settings,
            });
        }
        catch (error) {
            logger_1.logger.error('Error updating quote form settings:', { message: error.message, stack: error.stack });
            if (error.name === 'ValidationError') {
                res.status(400).json({ success: false, message: 'Validation error updating settings.', errors: error.errors });
            }
            else {
                res.status(500).json({ success: false, message: 'Error updating settings', errorDetails: error.message });
            }
        }
    }
}
exports.SettingsController = SettingsController;
//# sourceMappingURL=settingsController.js.map