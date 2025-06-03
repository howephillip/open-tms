"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShipperController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Shipper_1 = require("../models/Shipper");
const logger_1 = require("../utils/logger");
// Helper to parse sort query
const parseSortQuery = (sortQueryString) => {
    if (!sortQueryString)
        return { name: 1 }; // Default sort for shippers by name
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
class ShipperController {
    async getShippers(req, res) {
        logger_1.logger.info('Attempting to get shippers. Query params:', req.query);
        try {
            const pageQuery = req.query.page;
            const limitQuery = req.query.limit;
            const sortQueryString = req.query.sort || 'name';
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
            const { name, industry, searchTerm } = req.query; // Added searchTerm
            const specificFilters = {};
            if (name)
                specificFilters.name = { $regex: name, $options: 'i' };
            if (industry)
                specificFilters.industry = { $regex: industry, $options: 'i' };
            if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim() !== '') {
                const searchStr = searchTerm.trim();
                const searchRegex = { $regex: searchStr, $options: 'i' };
                const searchOrConditions = [
                    { name: searchRegex },
                    { industry: searchRegex },
                    { 'contact.name': searchRegex },
                    { 'contact.email': searchRegex },
                    { 'contact.phone': searchRegex }, // Consider stripping non-digits for phone search
                    { 'address.street': searchRegex },
                    { 'address.city': searchRegex },
                    { 'address.state': searchRegex },
                    { 'address.zip': searchRegex },
                    { 'billingInfo.invoiceEmail': searchRegex },
                    // Add other text fields from IShipper you want to search
                ];
                if (Object.keys(specificFilters).length > 0) {
                    query = { $and: [specificFilters, { $or: searchOrConditions }] };
                }
                else {
                    query = { $or: searchOrConditions };
                }
                logger_1.logger.info('Added global search conditions for shippers with searchTerm:', searchStr);
            }
            else {
                query = specificFilters;
            }
            logger_1.logger.info('Final Mongoose query for getShippers:', JSON.stringify(query));
            const shippers = await Shipper_1.Shipper.find(query)
                .sort(sortOptions)
                .limit(limit)
                .skip((page - 1) * limit)
                .lean(); // .populate('documents') // Optional: if you want to show document count/list
            const total = await Shipper_1.Shipper.countDocuments(query);
            logger_1.logger.info(`Found ${shippers.length} shippers, total matching query: ${total}.`);
            res.status(200).json({
                success: true,
                message: "Shippers fetched successfully",
                data: {
                    shippers, // Ensure frontend expects 'shippers'
                    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
                },
            });
        }
        catch (error) {
            logger_1.logger.error('CRITICAL ERROR in getShippers:', {
                message: error.message, name: error.name, stack: error.stack,
                query: req.query, errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
            });
            res.status(500).json({ success: false, message: 'Error fetching shippers', errorDetails: error.message });
        }
    }
    async createShipper(req, res) {
        logger_1.logger.info('Attempting to create shipper with body:', req.body);
        try {
            const { name, address, contact, billingInfo, industry } = req.body;
            // Enhanced validation
            if (!name || !industry ||
                !contact || !contact.name || !contact.email ||
                !address || !address.street || !address.city || !address.state || !address.zip ||
                !billingInfo || !billingInfo.invoiceEmail) {
                res.status(400).json({ success: false, message: 'Missing required fields. Ensure name, industry, full contact, full address, and invoice email are provided.' });
                return;
            }
            const newShipperData = { ...req.body };
            // Convert preferredEquipment string to array if necessary
            if (newShipperData.preferredEquipment && typeof newShipperData.preferredEquipment === 'string') {
                newShipperData.preferredEquipment = newShipperData.preferredEquipment.split(',').map((e) => e.trim()).filter((e) => e);
            }
            const newShipper = new Shipper_1.Shipper(newShipperData);
            await newShipper.save();
            logger_1.logger.info('Shipper created successfully', { shipperId: newShipper._id });
            res.status(201).json({
                success: true,
                message: 'Shipper created successfully',
                data: newShipper,
            });
        }
        catch (error) {
            logger_1.logger.error('CRITICAL ERROR in createShipper:', { /* ... detailed log ... */});
            if (error.name === 'ValidationError')
                res.status(400).json({ success: false, message: 'Validation Error creating shipper', errors: error.errors });
            else if (error.code === 11000)
                res.status(409).json({ success: false, message: 'A shipper with similar unique fields (e.g., name) might already exist.', errorDetails: error.keyValue });
            else
                res.status(500).json({ success: false, message: 'Error creating shipper', errorDetails: error.message });
        }
    }
    async getShipperById(req, res) {
        logger_1.logger.info(`Attempting to get shipper by ID: ${req.params.id}`);
        try {
            const { id } = req.params;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ success: false, message: 'Invalid shipper ID format.' });
                return;
            }
            const shipper = await Shipper_1.Shipper.findById(id)
                // .populate('documents') // If you want to show associated documents
                .lean();
            if (!shipper) {
                res.status(404).json({ success: false, message: 'Shipper not found.' });
                return;
            }
            res.status(200).json({ success: true, data: shipper });
        }
        catch (error) {
            logger_1.logger.error('Error in getShipperById:', { message: error.message, stack: error.stack, id: req.params.id });
            res.status(500).json({ success: false, message: 'Error fetching shipper details.', errorDetails: error.message });
        }
    }
    async updateShipper(req, res) {
        const { id } = req.params;
        logger_1.logger.info(`Attempting to update shipper ID: ${id} with body:`, req.body);
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid shipper ID format.' });
            return;
        }
        try {
            const updateData = { ...req.body };
            // Transform preferredEquipment string to array if necessary
            if (updateData.preferredEquipment && typeof updateData.preferredEquipment === 'string') {
                updateData.preferredEquipment = updateData.preferredEquipment.split(',').map((e) => e.trim()).filter((e) => e);
            }
            // Ensure nested objects are set correctly, e.g., for $set to work on sub-fields
            // If frontend sends flat structure like contactName, addressStreet:
            const payloadForUpdate = {};
            for (const key in updateData) {
                if (key.startsWith('contact') || key.startsWith('address') || key.startsWith('billingInfo')) {
                    const [parent, child] = key.split(/(?=[A-Z])/); // Splits 'contactName' into 'contact', 'Name'
                    if (parent && child) {
                        if (!payloadForUpdate[parent])
                            payloadForUpdate[parent] = {};
                        payloadForUpdate[parent][child.toLowerCase()] = updateData[key];
                    }
                }
                else {
                    payloadForUpdate[key] = updateData[key];
                }
            }
            // For fields like billingInfo.creditLimit which might be string from form
            if (payloadForUpdate.billingInfo && payloadForUpdate.billingInfo.creditlimit) {
                payloadForUpdate.billingInfo.creditLimit = parseFloat(payloadForUpdate.billingInfo.creditlimit);
                delete payloadForUpdate.billingInfo.creditlimit; // remove lowercase version
            }
            const updatedShipper = await Shipper_1.Shipper.findByIdAndUpdate(id, { $set: payloadForUpdate }, { new: true, runValidators: true }).lean();
            if (!updatedShipper) {
                res.status(404).json({ success: false, message: 'Shipper not found.' });
                return;
            }
            logger_1.logger.info('Shipper updated successfully', { shipperId: updatedShipper._id });
            res.status(200).json({ success: true, message: 'Shipper updated successfully.', data: updatedShipper });
        }
        catch (error) {
            logger_1.logger.error('CRITICAL ERROR in updateShipper:', { message: error.message, name: error.name, stack: error.stack, shipperId: id, requestBody: req.body });
            if (error.name === 'ValidationError')
                res.status(400).json({ success: false, message: 'Validation Error', errors: error.errors });
            else if (error.code === 11000)
                res.status(409).json({ success: false, message: 'Duplicate name or other unique field.', errorDetails: error.keyValue });
            else
                res.status(500).json({ success: false, message: 'Error updating shipper.', errorDetails: error.message });
        }
    }
}
exports.ShipperController = ShipperController;
//# sourceMappingURL=shipperController.js.map