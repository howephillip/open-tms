"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarrierController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Carrier_1 = require("../models/Carrier");
const saferService_1 = require("../services/integrations/saferService");
const logger_1 = require("../utils/logger");
const saferService = new saferService_1.SaferService();
// Helper to parse sort query: "field" for asc, "-field" for desc
const parseSortQuery = (sortQueryString) => {
    if (!sortQueryString)
        return { name: 1 }; // Default sort for carriers by name
    const sortOptions = {};
    sortQueryString.split(',').forEach(part => {
        const trimmedPart = part.trim();
        if (trimmedPart.startsWith('-')) {
            sortOptions[trimmedPart.substring(1)] = -1;
        }
        else {
            sortOptions[trimmedPart] = 1;
        }
    });
    return sortOptions;
};
class CarrierController {
    async getCarriers(req, res) {
        logger_1.logger.info('Attempting to get carriers. Query params:', req.query);
        try {
            const pageQuery = req.query.page;
            const limitQuery = req.query.limit;
            const sortQueryString = req.query.sort || 'name'; // Default sort by name
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
            let query = {};
            const { name, mcNumber, dotNumber, searchTerm } = req.query; // Added searchTerm
            const specificFilters = {};
            if (name)
                specificFilters.name = { $regex: name, $options: 'i' };
            if (mcNumber)
                specificFilters.mcNumber = { $regex: mcNumber, $options: 'i' }; // mcNumber might be exact match
            if (dotNumber)
                specificFilters.dotNumber = { $regex: dotNumber, $options: 'i' }; // dotNumber might be exact match
            if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim() !== '') {
                const searchStr = searchTerm.trim();
                const searchRegex = { $regex: searchStr, $options: 'i' };
                const searchOrConditions = [
                    { name: searchRegex },
                    { mcNumber: searchRegex },
                    { dotNumber: searchRegex },
                    { 'contact.name': searchRegex },
                    { 'contact.email': searchRegex },
                    { 'contact.phone': searchRegex }, // Might want to strip non-digits for phone search
                    { 'address.street': searchRegex },
                    { 'address.city': searchRegex },
                    { 'address.state': searchRegex },
                    { 'address.zip': searchRegex },
                    { 'saferData.saferRating': searchRegex }, // Search SAFER rating if stored
                    // Add other text fields from ICarrier you want to search
                ];
                // If specificFilters has keys, combine with $and
                if (Object.keys(specificFilters).length > 0) {
                    query = { $and: [specificFilters, { $or: searchOrConditions }] };
                }
                else {
                    query = { $or: searchOrConditions };
                }
                logger_1.logger.info('Added global search conditions for carriers with searchTerm:', searchStr);
            }
            else {
                query = specificFilters;
            }
            logger_1.logger.info('Final Mongoose query for getCarriers:', JSON.stringify(query));
            const carriers = await Carrier_1.Carrier.find(query)
                .sort(sortOptions)
                .limit(limit)
                .skip((page - 1) * limit)
                .lean();
            const total = await Carrier_1.Carrier.countDocuments(query);
            logger_1.logger.info(`Found ${carriers.length} carriers, total matching query: ${total}.`);
            res.status(200).json({
                success: true,
                message: "Carriers fetched successfully",
                data: {
                    carriers, // Ensure your frontend expects 'carriers' key
                    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
                },
            });
        }
        catch (error) {
            logger_1.logger.error('CRITICAL ERROR in getCarriers:', {
                message: error.message, name: error.name, stack: error.stack,
                query: req.query, errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
            });
            res.status(500).json({ success: false, message: 'Error fetching carriers', errorDetails: error.message });
        }
    }
    async createCarrier(req, res) {
        // ... (createCarrier method - ensure it's the latest version from previous full file I provided) ...
        logger_1.logger.info('Attempting to create carrier with body:', req.body);
        try {
            const { name, mcNumber, dotNumber, contact, address } = req.body;
            if (!name || !mcNumber || !dotNumber || !contact || !address || !contact.name || !contact.email || !address.street || !address.city || !address.state || !address.zip) {
                res.status(400).json({ success: false, message: 'Missing required fields for carrier (name, mcNumber, dotNumber, full contact, full address).' });
                return;
            }
            const newCarrier = new Carrier_1.Carrier(req.body);
            await newCarrier.save();
            logger_1.logger.info('Carrier created successfully', { carrierId: newCarrier._id });
            if (newCarrier.dotNumber) {
                try {
                    logger_1.logger.info(`Fetching SAFER data for new carrier DOT: ${newCarrier.dotNumber}`);
                    const saferData = await saferService.getCarrierSafetyData(newCarrier.dotNumber);
                    if (saferData) {
                        newCarrier.saferData = { ...newCarrier.saferData, ...saferData, lastUpdated: new Date() };
                        await newCarrier.save();
                        logger_1.logger.info(`SAFER data updated for new carrier ${newCarrier.name}`);
                    }
                }
                catch (saferError) {
                    logger_1.logger.warn(`Could not fetch SAFER data for new carrier ${newCarrier.name}: ${saferError.message}`);
                }
            }
            res.status(201).json({ success: true, message: 'Carrier created successfully', data: newCarrier });
        }
        catch (error) {
            logger_1.logger.error('CRITICAL ERROR in createCarrier:', { /* ... */});
            if (error.name === 'ValidationError')
                res.status(400).json({ success: false, message: 'Validation Error', errors: error.errors });
            else if (error.code === 11000)
                res.status(409).json({ success: false, message: 'Duplicate MC or DOT.', errorDetails: error.keyValue });
            else
                res.status(500).json({ success: false, message: 'Error creating carrier', errorDetails: error.message });
        }
    }
    async getCarrierById(req, res) {
        // ... (getCarrierById method - ensure it's the latest version) ...
        logger_1.logger.info(`Attempting to get carrier by ID: ${req.params.id}`);
        try {
            const { id } = req.params;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ success: false, message: 'Invalid carrier ID format.' });
                return;
            }
            const carrier = await Carrier_1.Carrier.findById(id).lean(); // Add .populate('documents') if you want to show associated docs
            if (!carrier) {
                res.status(404).json({ success: false, message: 'Carrier not found.' });
                return;
            }
            res.status(200).json({ success: true, data: carrier });
        }
        catch (error) {
            logger_1.logger.error('Error in getCarrierById:', { message: error.message, stack: error.stack, id: req.params.id });
            res.status(500).json({ success: false, message: 'Error fetching carrier details.', errorDetails: error.message });
        }
    }
    async updateSaferDataForCarrier(req, res) {
        // ... (updateSaferDataForCarrier method - ensure it's the latest version) ...
        const { id } = req.params;
        logger_1.logger.info(`Attempting to update SAFER data for carrier ID: ${id}`);
        try {
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ success: false, message: 'Invalid carrier ID format.' });
                return;
            }
            const carrier = await Carrier_1.Carrier.findById(id);
            if (!carrier) {
                res.status(404).json({ success: false, message: 'Carrier not found.' });
                return;
            }
            if (!carrier.dotNumber) {
                res.status(400).json({ success: false, message: 'Carrier does not have a DOT number.' });
                return;
            }
            const safetyData = await saferService.getCarrierSafetyData(carrier.dotNumber);
            if (safetyData) {
                carrier.saferData = { ...(carrier.saferData || {}), ...safetyData, lastUpdated: new Date() };
                await carrier.save();
                logger_1.logger.info(`SAFER data updated for carrier: ${carrier.name}`);
                res.status(200).json({ success: true, message: 'SAFER data updated successfully.', data: carrier });
            }
            else {
                logger_1.logger.warn(`No SAFER data found for DOT: ${carrier.dotNumber}`);
                res.status(404).json({ success: false, message: `No SAFER data found for DOT: ${carrier.dotNumber}` });
            }
        }
        catch (error) {
            logger_1.logger.error('CRITICAL ERROR in updateSaferDataForCarrier:', { /* ... */});
            res.status(500).json({ success: false, message: 'Error updating SAFER data.', errorDetails: error.message });
        }
    }
    async updateCarrier(req, res) {
        const { id } = req.params;
        logger_1.logger.info(`Attempting to update carrier ID: ${id} with body:`, req.body);
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid carrier ID format.' });
            return;
        }
        try {
            const { name, mcNumber, dotNumber, contactName, contactPhone, contactEmail, addressStreet, addressCity, addressState, addressZip } = req.body;
            const updateData = {};
            if (name)
                updateData.name = name;
            if (mcNumber)
                updateData.mcNumber = mcNumber;
            if (dotNumber)
                updateData.dotNumber = dotNumber;
            if (contactName)
                updateData['contact.name'] = contactName;
            if (contactPhone)
                updateData['contact.phone'] = contactPhone;
            if (contactEmail)
                updateData['contact.email'] = contactEmail;
            if (addressStreet)
                updateData['address.street'] = addressStreet;
            if (addressCity)
                updateData['address.city'] = addressCity;
            if (addressState)
                updateData['address.state'] = addressState;
            if (addressZip)
                updateData['address.zip'] = addressZip;
            const updatedCarrier = await Carrier_1.Carrier.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true }).lean();
            if (!updatedCarrier) {
                res.status(404).json({ success: false, message: 'Carrier not found.' });
                return;
            }
            logger_1.logger.info('Carrier updated successfully', { carrierId: updatedCarrier._id });
            res.status(200).json({ success: true, message: 'Carrier updated successfully.', data: updatedCarrier });
        }
        catch (error) {
            logger_1.logger.error('CRITICAL ERROR in updateCarrier:', { message: error.message, name: error.name, stack: error.stack, carrierId: id, requestBody: req.body });
            if (error.name === 'ValidationError')
                res.status(400).json({ success: false, message: 'Validation Error', errors: error.errors });
            else if (error.code === 11000)
                res.status(409).json({ success: false, message: 'Duplicate MC or DOT number.', errorDetails: error.keyValue });
            else
                res.status(500).json({ success: false, message: 'Error updating carrier.', errorDetails: error.message });
        }
    }
}
exports.CarrierController = CarrierController;
//# sourceMappingURL=carrierController.js.map