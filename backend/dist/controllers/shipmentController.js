"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShipmentController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Shipment_1 = require("../models/Shipment");
const User_1 = require("../models/User");
const ApplicationSettings_1 = require("../models/ApplicationSettings");
const emailService_1 = require("../services/ai/emailService");
const logger_1 = require("../utils/logger");
let aiEmailServiceInstance = null;
function getAIEmailService() {
    if (!aiEmailServiceInstance) {
        logger_1.logger.info('Instantiating AIEmailService for the first time...');
        try {
            aiEmailServiceInstance = new emailService_1.AIEmailService();
        }
        catch (error) {
            logger_1.logger.error('Failed to instantiate AIEmailService:', { message: error.message, stack: error.stack });
            throw new Error('AIEmailService could not be initialized.');
        }
    }
    return aiEmailServiceInstance;
}
const parseSortQuery = (sortQueryString) => {
    if (!sortQueryString)
        return { createdAt: -1 };
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
    return Object.keys(sortOptions).length > 0 ? sortOptions : defaultSort;
};
const defaultControllerQuoteFormSettings = {
    requiredFields: [
        'shipper', 'modeOfTransport', 'equipmentType',
        'origin.city', 'origin.state',
        'destination.city', 'destination.state',
        'scheduledPickupDate',
        'commodityDescription',
        'customerRate'
    ],
    quoteNumberPrefix: 'QT-',
    quoteNumberNextSequence: 1001,
};
logger_1.logger.info('SHIPMENT CONTROLLER: defaultControllerQuoteFormSettings has been defined at module scope.');
const getFieldValue = (payload, fieldId) => {
    const parts = fieldId.split('.');
    let value = payload;
    for (const part of parts) {
        if (value && typeof value === 'object' && value.hasOwnProperty(part)) {
            value = value[part];
        }
        else {
            return undefined;
        }
    }
    return value;
};
class ShipmentController {
    async createShipment(req, res) {
        logger_1.logger.info('--- ENTERING createShipment ---');
        try {
            let activeQuoteFormSettings = { ...defaultControllerQuoteFormSettings };
            try {
                const settingsDoc = await ApplicationSettings_1.ApplicationSettings.findOne({ key: 'quoteForm' }).lean();
                if (settingsDoc && settingsDoc.settings) {
                    const dbSettings = settingsDoc.settings;
                    activeQuoteFormSettings = {
                        requiredFields: dbSettings.requiredFields && dbSettings.requiredFields.length > 0 ? dbSettings.requiredFields : defaultControllerQuoteFormSettings.requiredFields,
                        quoteNumberPrefix: dbSettings.quoteNumberPrefix || defaultControllerQuoteFormSettings.quoteNumberPrefix,
                        quoteNumberNextSequence: dbSettings.quoteNumberNextSequence || defaultControllerQuoteFormSettings.quoteNumberNextSequence,
                    };
                    logger_1.logger.info('Loaded quote form settings from DB for validation:', activeQuoteFormSettings.requiredFields);
                }
                else {
                    logger_1.logger.warn('No quote form settings found in DB for validation, using controller defaults:', activeQuoteFormSettings.requiredFields);
                }
            }
            catch (settingsError) {
                logger_1.logger.error('Error fetching quoteForm settings, using controller defaults:', settingsError.message);
            }
            const { documentIds, accessorials: accessorialsData, fscType, fscCustomerAmount, fscCarrierAmount, chassisCustomerCost, chassisCarrierCost, ...shipmentPayload } = req.body;
            logger_1.logger.info('Shipment payload received for validation:', JSON.stringify(shipmentPayload, null, 2));
            const missingFields = [];
            if (!shipmentPayload.createdBy)
                missingFields.push('createdBy (System)');
            if (!shipmentPayload.status)
                missingFields.push('status (System)');
            if (shipmentPayload.status === 'quote') {
                logger_1.logger.info('Validating as a QUOTE using settings:', activeQuoteFormSettings.requiredFields);
                (activeQuoteFormSettings.requiredFields || []).forEach(fieldId => {
                    const value = getFieldValue(shipmentPayload, fieldId);
                    if (fieldId === 'carrier' && !shipmentPayload.carrier) {
                        return;
                    }
                    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
                        missingFields.push(fieldId);
                    }
                });
            }
            else {
                logger_1.logger.info('Validating as a non-quote SHIPMENT.');
                const universallyRequiredForBooked = [
                    'shipper', 'carrier', 'modeOfTransport',
                    'origin.city', 'origin.state',
                    'destination.city', 'destination.state',
                    'scheduledPickupDate', 'scheduledDeliveryDate',
                    'equipmentType', 'commodityDescription',
                    'customerRate', 'carrierCostTotal'
                ];
                universallyRequiredForBooked.forEach(fieldId => {
                    const value = getFieldValue(shipmentPayload, fieldId);
                    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
                        missingFields.push(fieldId);
                    }
                });
            }
            if (missingFields.length > 0) {
                const uniqueMissingFields = [...new Set(missingFields)];
                logger_1.logger.warn(`Validation Error: Missing required fields. Missing: ${uniqueMissingFields.join(', ')}.`);
                res.status(400).json({ success: false, message: `Missing required fields: ${uniqueMissingFields.join(', ')}.` });
                return;
            }
            const shipmentData = { ...shipmentPayload };
            // Shipper processing
            if (shipmentData.hasOwnProperty('shipper')) {
                const shipperValue = shipmentData.shipper;
                if (typeof shipperValue === 'string') {
                    if (mongoose_1.default.Types.ObjectId.isValid(shipperValue)) {
                        shipmentData.shipper = new mongoose_1.default.Types.ObjectId(shipperValue);
                    }
                    else if (shipperValue.trim() === '') {
                        logger_1.logger.warn('Shipper ID is an empty string for createShipment.'); // Should be caught by validation
                        res.status(400).json({ success: false, message: 'Shipper ID cannot be empty.' });
                        return;
                    }
                    else {
                        logger_1.logger.warn(`Invalid shipper ID format: ${shipperValue}`);
                        res.status(400).json({ success: false, message: 'Invalid Shipper ID format.' });
                        return;
                    }
                }
                else if (shipperValue === null || shipperValue === undefined) {
                    // This case should also be caught by validation if shipper is required
                    logger_1.logger.warn('Shipper ID is missing or null for createShipment.');
                    res.status(400).json({ success: false, message: 'Shipper ID is required.' });
                    return;
                }
            }
            else if (!shipmentData.shipper) { // If not even in payload and is required
                logger_1.logger.warn('Shipper ID is missing from payload for createShipment.');
                res.status(400).json({ success: false, message: 'Shipper ID is required.' });
                return;
            }
            // Carrier processing
            if (shipmentData.hasOwnProperty('carrier')) {
                const carrierValue = shipmentData.carrier;
                if (typeof carrierValue === 'string') {
                    if (carrierValue.trim() === '') { // Empty string means unset for optional carrier
                        delete shipmentData.carrier;
                    }
                    else if (mongoose_1.default.Types.ObjectId.isValid(carrierValue)) {
                        shipmentData.carrier = new mongoose_1.default.Types.ObjectId(carrierValue);
                    }
                    else { // Non-empty string but invalid ObjectId
                        logger_1.logger.warn(`Invalid carrier ID: ${carrierValue}`);
                        res.status(400).json({ success: false, message: "Invalid Carrier ID format." });
                        return;
                    }
                }
                else if (carrierValue === null || carrierValue === undefined) {
                    delete shipmentData.carrier;
                }
            }
            else if (shipmentPayload.status !== 'quote' && !shipmentData.carrier) {
                logger_1.logger.warn('Carrier ID is missing for non-quote shipment.');
                res.status(400).json({ success: false, message: 'Carrier ID is required for booked shipments.' });
                return;
            }
            if (shipmentData.createdBy && typeof shipmentData.createdBy === 'string') {
                if (mongoose_1.default.Types.ObjectId.isValid(shipmentData.createdBy)) {
                    shipmentData.createdBy = new mongoose_1.default.Types.ObjectId(shipmentData.createdBy);
                }
                else {
                    logger_1.logger.warn(`Invalid createdBy ID: ${shipmentData.createdBy}`);
                    res.status(400).json({ success: false, message: 'Invalid createdBy ID format.' });
                    return;
                }
            }
            if (shipmentPayload.otherReferenceNumbersString && typeof shipmentPayload.otherReferenceNumbersString === 'string') {
                try {
                    shipmentData.otherReferenceNumbers = shipmentPayload.otherReferenceNumbersString.split(',')
                        .map((refStr) => { const parts = refStr.split(':'); const type = parts[0]?.trim(); const value = parts.slice(1).join(':')?.trim(); return { type, value }; })
                        .filter((ref) => ref.type && ref.value);
                }
                catch (e) {
                    logger_1.logger.warn("Could not parse otherReferenceNumbersString.", e);
                    shipmentData.otherReferenceNumbers = [];
                }
            }
            else if (Array.isArray(shipmentPayload.otherReferenceNumbers)) {
                shipmentData.otherReferenceNumbers = shipmentPayload.otherReferenceNumbers.filter((ref) => typeof ref === 'object' && ref.type && ref.value);
            }
            if (documentIds && Array.isArray(documentIds)) {
                shipmentData.documents = documentIds.filter(id => typeof id === 'string' && mongoose_1.default.Types.ObjectId.isValid(id)).map(id => new mongoose_1.default.Types.ObjectId(id));
            }
            else {
                shipmentData.documents = [];
            }
            if (accessorialsData && Array.isArray(accessorialsData)) {
                shipmentData.accessorials = accessorialsData.map((acc) => ({
                    accessorialTypeId: new mongoose_1.default.Types.ObjectId(acc.accessorialTypeId), name: acc.name,
                    quantity: parseFloat(acc.quantity) || 1, customerRate: parseFloat(acc.customerRate) || 0,
                    carrierCost: parseFloat(acc.carrierCost) || 0, notes: acc.notes
                })).filter((acc) => mongoose_1.default.Types.ObjectId.isValid(acc.accessorialTypeId));
            }
            else {
                shipmentData.accessorials = [];
            }
            if (fscType !== undefined && fscType !== '')
                shipmentData.fscType = fscType;
            else
                delete shipmentData.fscType;
            if (fscCustomerAmount !== undefined && fscCustomerAmount !== null && fscCustomerAmount !== '')
                shipmentData.fscCustomerAmount = parseFloat(fscCustomerAmount);
            else
                delete shipmentData.fscCustomerAmount;
            if (fscCarrierAmount !== undefined && fscCarrierAmount !== null && fscCarrierAmount !== '')
                shipmentData.fscCarrierAmount = parseFloat(fscCarrierAmount);
            else
                delete shipmentData.fscCarrierAmount;
            if (chassisCustomerCost !== undefined && chassisCustomerCost !== null && chassisCustomerCost !== '')
                shipmentData.chassisCustomerCost = parseFloat(chassisCustomerCost);
            else
                delete shipmentData.chassisCustomerCost;
            if (chassisCarrierCost !== undefined && chassisCarrierCost !== null && chassisCarrierCost !== '')
                shipmentData.chassisCarrierCost = parseFloat(chassisCarrierCost);
            else
                delete shipmentData.chassisCarrierCost;
            const dateFields = ['lastFreeDayPort', 'lastFreeDayRail', 'emptyContainerReturnByDate', 'chassisReturnByDate', 'transloadDate', 'scheduledPickupDate', 'scheduledDeliveryDate', 'actualPickupDateTime', 'actualDeliveryDateTime', 'quoteValidUntil'];
            dateFields.forEach(field => { if (shipmentData[field] && typeof shipmentData[field] === 'string') {
                const dateVal = new Date(shipmentData[field]);
                if (!isNaN(dateVal.getTime()))
                    shipmentData[field] = dateVal;
                else {
                    shipmentData[field] = undefined;
                }
            } });
            const shipment = new Shipment_1.Shipment(shipmentData);
            await shipment.save();
            logger_1.logger.info('Shipment saved successfully', { shipmentId: shipment._id, shipmentNumber: shipment.shipmentNumber });
            const populatedShipment = await Shipment_1.Shipment.findById(shipment._id)
                .populate({ path: 'shipper', select: 'name' }).populate({ path: 'carrier', select: 'name' })
                .populate({ path: 'createdBy', select: 'firstName lastName email' })
                .populate({ path: 'documents', select: 'originalName _id mimetype size createdAt path' })
                .populate({ path: 'accessorials.accessorialTypeId', select: 'name code unitName' })
                .lean();
            res.status(201).json({ success: true, data: populatedShipment, message: 'Shipment created successfully' });
        }
        catch (error) {
            logger_1.logger.error('CRITICAL ERROR in createShipment:', { message: error.message, name: error.name, stack: error.stack, requestBody: req.body, errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error), 2) });
            if (error.name === 'ValidationError') {
                res.status(400).json({ success: false, message: error.message, errors: error.errors });
            }
            else if (error.code === 11000) {
                res.status(409).json({ success: false, message: `Duplicate key error. Field: ${JSON.stringify(error.keyValue)}`, errorDetails: error.keyValue });
            }
            else {
                res.status(500).json({ success: false, message: 'Error creating shipment', errorDetails: error.message });
            }
        }
    }
    async getShipments(req, res) {
        // ... (No 'return res.status' at end of try) ...
        logger_1.logger.info('Attempting to get shipments. Query params:', req.query);
        try {
            const pageQuery = req.query.page;
            const limitQuery = req.query.limit;
            const sortQueryString = req.query.sort || '-createdAt';
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
            const { status, statusesNotIn, tags, shipper, carrier, startDate, endDate, shipmentNumber, modeOfTransport, containerNumber, deliveryOrderNumber, proNumber, billOfLadingNumber, purchaseOrderNumbers, searchTerm } = req.query;
            const specificFilters = {};
            if (shipmentNumber)
                specificFilters.shipmentNumber = { $regex: shipmentNumber, $options: 'i' };
            if (billOfLadingNumber)
                specificFilters.billOfLadingNumber = { $regex: billOfLadingNumber, $options: 'i' };
            if (proNumber)
                specificFilters.proNumber = { $regex: proNumber, $options: 'i' };
            if (status) {
                specificFilters.status = status;
            }
            else if (statusesNotIn) {
                const notInArray = Array.isArray(statusesNotIn) ? statusesNotIn : statusesNotIn.split(',');
                specificFilters.status = { $nin: notInArray };
            }
            if (modeOfTransport)
                specificFilters.modeOfTransport = modeOfTransport;
            if (containerNumber)
                specificFilters.containerNumber = { $regex: containerNumber, $options: 'i' };
            if (deliveryOrderNumber)
                specificFilters.deliveryOrderNumber = { $regex: deliveryOrderNumber, $options: 'i' };
            if (purchaseOrderNumbers && typeof purchaseOrderNumbers === 'string')
                specificFilters.purchaseOrderNumbers = { $in: purchaseOrderNumbers.split(',').map(po => po.trim()).filter(po => po) };
            if (tags && typeof tags === 'string')
                specificFilters.customTags = { $in: tags.split(',').map(tag => tag.trim()).filter(tag => tag) };
            if (shipper && mongoose_1.default.Types.ObjectId.isValid(shipper))
                specificFilters.shipper = new mongoose_1.default.Types.ObjectId(shipper);
            if (carrier && mongoose_1.default.Types.ObjectId.isValid(carrier))
                specificFilters.carrier = new mongoose_1.default.Types.ObjectId(carrier);
            if (startDate || endDate) {
                specificFilters.scheduledPickupDate = {};
                if (startDate)
                    specificFilters.scheduledPickupDate.$gte = new Date(startDate);
                if (endDate)
                    specificFilters.scheduledPickupDate.$lte = new Date(endDate);
            }
            let shipments;
            let total;
            if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim() !== '') {
                const searchStr = searchTerm.trim();
                const searchRegex = { $regex: searchStr, $options: 'i' };
                const textSearchOrConditions = [
                    { shipmentNumber: searchRegex }, { billOfLadingNumber: searchRegex }, { proNumber: searchRegex }, { containerNumber: searchRegex },
                    { deliveryOrderNumber: searchRegex }, { bookingNumber: searchRegex }, { pickupNumber: searchRegex }, { proofOfDeliveryNumber: searchRegex },
                    { purchaseOrderNumbers: searchRegex }, { 'otherReferenceNumbers.value': searchRegex }, { 'otherReferenceNumbers.type': searchRegex },
                    { 'origin.name': searchRegex }, { 'origin.city': searchRegex }, { 'origin.state': searchRegex }, { 'origin.zip': searchRegex }, { 'origin.address': searchRegex }, { 'origin.contactName': searchRegex }, { 'origin.contactEmail': searchRegex },
                    { 'destination.name': searchRegex }, { 'destination.city': searchRegex }, { 'destination.state': searchRegex }, { 'destination.zip': searchRegex }, { 'destination.address': searchRegex }, { 'destination.contactName': searchRegex }, { 'destination.contactEmail': searchRegex },
                    { commodityDescription: searchRegex }, { equipmentType: searchRegex }, { terminal: searchRegex }, { steamshipLine: searchRegex }, { vesselName: searchRegex },
                    { railOriginRamp: searchRegex }, { railDestinationRamp: searchRegex }, { railCarrier: searchRegex },
                    { airline: searchRegex }, { flightNumber: searchRegex }, { masterAirWaybill: searchRegex }, { houseAirWaybill: searchRegex }
                ];
                const basePipeline = [{ $match: specificFilters }, { $lookup: { from: 'shippers', localField: 'shipper', foreignField: '_id', as: 'shipperDoc' } }, { $unwind: { path: '$shipperDoc', preserveNullAndEmptyArrays: true } }, { $lookup: { from: 'carriers', localField: 'carrier', foreignField: '_id', as: 'carrierDoc' } }, { $unwind: { path: '$carrierDoc', preserveNullAndEmptyArrays: true } }, { $lookup: { from: 'users', localField: 'createdBy', foreignField: '_id', as: 'createdByUserDoc' } }, { $unwind: { path: '$createdByUserDoc', preserveNullAndEmptyArrays: true } },];
                const searchMatchStage = { $match: { $or: [...textSearchOrConditions, { 'shipperDoc.name': searchRegex }, { 'shipperDoc.contact.name': searchRegex }, { 'shipperDoc.contact.email': searchRegex }, { 'shipperDoc.contact.phone': searchRegex }, { 'carrierDoc.name': searchRegex }, { 'carrierDoc.mcNumber': searchRegex }, { 'carrierDoc.dotNumber': searchRegex }, { 'carrierDoc.contact.name': searchRegex }, { 'carrierDoc.contact.email': searchRegex }, { 'carrierDoc.contact.phone': searchRegex },] } };
                if (mongoose_1.default.Types.ObjectId.isValid(searchStr)) {
                    searchMatchStage.$match.$or.push({ 'shipperDoc._id': new mongoose_1.default.Types.ObjectId(searchStr) });
                    searchMatchStage.$match.$or.push({ 'carrierDoc._id': new mongoose_1.default.Types.ObjectId(searchStr) });
                }
                const projectStage = { $project: { _id: 1, shipmentNumber: 1, billOfLadingNumber: 1, proNumber: 1, deliveryOrderNumber: 1, bookingNumber: 1, containerNumber: 1, sealNumber: 1, pickupNumber: 1, proofOfDeliveryNumber: 1, purchaseOrderNumbers: 1, otherReferenceNumbers: 1, shipper: { _id: '$shipperDoc._id', name: '$shipperDoc.name', contact: '$shipperDoc.contact' }, carrier: { _id: '$carrierDoc._id', name: '$carrierDoc.name', mcNumber: '$carrierDoc.mcNumber', dotNumber: '$carrierDoc.dotNumber', contact: '$carrierDoc.contact' }, consignee: 1, billTo: 1, modeOfTransport: 1, steamshipLine: 1, vesselName: 1, voyageNumber: 1, terminal: 1, lastFreeDayPort: 1, lastFreeDayRail: 1, emptyReturnDepot: 1, emptyContainerReturnByDate: 1, chassisNumber: 1, chassisType: 1, chassisProvider: 1, chassisReturnByDate: 1, railOriginRamp: 1, railDestinationRamp: 1, railCarrier: 1, airline: 1, flightNumber: 1, masterAirWaybill: 1, houseAirWaybill: 1, airportOfDeparture: 1, airportOfArrival: 1, isTransload: 1, transloadFacility: 1, transloadDate: 1, origin: 1, destination: 1, scheduledPickupDate: 1, scheduledPickupTime: 1, pickupAppointmentNumber: 1, actualPickupDateTime: 1, scheduledDeliveryDate: 1, scheduledDeliveryTime: 1, deliveryAppointmentNumber: 1, actualDeliveryDateTime: 1, status: 1, equipmentType: 1, equipmentLength: 1, equipmentUnit: 1, commodityDescription: 1, pieceCount: 1, packageType: 1, totalWeight: 1, weightUnit: 1, isHazardous: 1, unNumber: 1, hazmatClass: 1, isTemperatureControlled: 1, temperatureMin: 1, temperatureMax: 1, tempUnit: 1, customerRate: 1, carrierCostTotal: 1, grossProfit: 1, margin: 1, internalNotes: 1, specialInstructions: 1, customTags: 1, checkIns: 1, documents: 1, createdBy: { _id: '$createdByUserDoc._id', firstName: '$createdByUserDoc.firstName', lastName: '$createdByUserDoc.lastName', email: '$createdByUserDoc.email' }, createdAt: 1, updatedAt: 1, fscType: 1, fscCustomerAmount: 1, fscCarrierAmount: 1, chassisCustomerCost: 1, chassisCarrierCost: 1, totalCustomerRate: 1, totalCarrierCost: 1 } };
                const dataPipeline = [...basePipeline, searchMatchStage, { $sort: sortOptions }, { $skip: (page - 1) * limit }, { $limit: limit }, projectStage];
                const countPipeline = [...basePipeline, searchMatchStage, { $count: 'total' }];
                logger_1.logger.info('Executing AGGREGATION pipeline for data with searchTerm:', searchStr, 'Filters:', JSON.stringify(specificFilters));
                shipments = await Shipment_1.Shipment.aggregate(dataPipeline);
                const countResult = await Shipment_1.Shipment.aggregate(countPipeline);
                total = countResult.length > 0 ? countResult[0].total : 0;
            }
            else {
                query = specificFilters;
                logger_1.logger.info('Executing find().populate() (no global search):', JSON.stringify(query));
                shipments = await Shipment_1.Shipment.find(query)
                    .populate({ path: 'shipper', select: 'name contact' })
                    .populate({ path: 'carrier', select: 'name contact mcNumber dotNumber' })
                    .populate({ path: 'createdBy', select: 'firstName lastName email' })
                    .sort(sortOptions)
                    .limit(limit)
                    .skip((page - 1) * limit)
                    .lean();
                total = await Shipment_1.Shipment.countDocuments(query);
            }
            logger_1.logger.info(`Found ${shipments.length} shipments, total matching query: ${total}. Sending response.`);
            res.status(200).json({ success: true, message: "Shipments fetched successfully", data: { shipments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }, });
        }
        catch (error) {
            logger_1.logger.error('CRITICAL ERROR in getShipments:', { message: error.message, name: error.name, stack: error.stack, query: req.query, errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error), 2) });
            res.status(500).json({ success: false, message: 'Internal server error while fetching shipments.', errorDetails: error.message });
        }
    }
    async updateShipment(req, res) {
        const { id } = req.params;
        logger_1.logger.info(`Attempting to update shipment ID: ${id} with body:`, JSON.stringify(req.body, null, 2));
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid shipment ID format.' });
            return;
        }
        try {
            let activeQuoteFormSettings = { ...defaultControllerQuoteFormSettings };
            try {
                const settingsDoc = await ApplicationSettings_1.ApplicationSettings.findOne({ key: 'quoteForm' }).lean();
                if (settingsDoc && settingsDoc.settings) {
                    const dbSettings = settingsDoc.settings;
                    activeQuoteFormSettings = {
                        ...defaultControllerQuoteFormSettings,
                        ...settingsDoc.settings,
                        requiredFields: dbSettings.requiredFields && dbSettings.requiredFields.length > 0 ? dbSettings.requiredFields : defaultControllerQuoteFormSettings.requiredFields,
                    };
                    logger_1.logger.info('Loaded quote form settings from DB for update validation:', activeQuoteFormSettings.requiredFields);
                }
                else {
                    logger_1.logger.warn('No quote form settings found in DB for update validation, using controller defaults:', activeQuoteFormSettings.requiredFields);
                }
            }
            catch (settingsError) {
                logger_1.logger.error('Error fetching quoteForm settings for update, using controller defaults:', settingsError.message);
            }
            const { documentIds, accessorials: accessorialsData, fscType, fscCustomerAmount, fscCarrierAmount, chassisCustomerCost, chassisCarrierCost, ...shipmentPayload } = req.body;
            const shipmentDataToUpdate = { ...shipmentPayload };
            const missingFieldsUpdate = [];
            if (shipmentDataToUpdate.status === 'quote') {
                logger_1.logger.info('Validating UPDATED QUOTE using settings:', activeQuoteFormSettings.requiredFields);
                (activeQuoteFormSettings.requiredFields || []).forEach(fieldId => {
                    const value = getFieldValue(shipmentDataToUpdate, fieldId);
                    if (fieldId === 'carrier' && !shipmentDataToUpdate.carrier) {
                        return;
                    }
                    let fieldExistsInPayload = shipmentPayload.hasOwnProperty(fieldId);
                    if (!fieldExistsInPayload && fieldId.startsWith('origin')) {
                        const subFieldParts = fieldId.split('.');
                        if (subFieldParts.length > 1 && shipmentPayload.origin?.hasOwnProperty(subFieldParts[1])) {
                            fieldExistsInPayload = true;
                        }
                    }
                    else if (!fieldExistsInPayload && fieldId.startsWith('destination')) {
                        const subFieldParts = fieldId.split('.');
                        if (subFieldParts.length > 1 && shipmentPayload.destination?.hasOwnProperty(subFieldParts[1])) {
                            fieldExistsInPayload = true;
                        }
                    }
                    if (fieldExistsInPayload && (value === undefined || value === null || (typeof value === 'string' && value.trim() === ''))) {
                        missingFieldsUpdate.push(fieldId);
                    }
                });
            }
            else if (shipmentDataToUpdate.status && shipmentDataToUpdate.status !== 'quote') { // Explicit cast for comparison
                logger_1.logger.info('Validating UPDATED non-quote SHIPMENT.');
                const universallyRequiredForBooked = [
                    'shipper', 'carrier', 'modeOfTransport',
                    'origin.city', 'origin.state',
                    'destination.city', 'destination.state',
                    'scheduledPickupDate', 'scheduledDeliveryDate',
                    'equipmentType', 'commodityDescription',
                    'customerRate', 'carrierCostTotal'
                ];
                universallyRequiredForBooked.forEach(fieldId => {
                    const value = getFieldValue(shipmentDataToUpdate, fieldId);
                    let fieldInPayload = shipmentPayload.hasOwnProperty(fieldId);
                    if (!fieldInPayload && fieldId.startsWith('origin')) {
                        const subFieldParts = fieldId.split('.');
                        if (subFieldParts.length > 1 && shipmentPayload.origin?.hasOwnProperty(subFieldParts[1]))
                            fieldInPayload = true;
                    }
                    else if (!fieldInPayload && fieldId.startsWith('destination')) {
                        const subFieldParts = fieldId.split('.');
                        if (subFieldParts.length > 1 && shipmentPayload.destination?.hasOwnProperty(subFieldParts[1]))
                            fieldInPayload = true;
                    }
                    if (fieldInPayload && (value === undefined || value === null || (typeof value === 'string' && value.trim() === ''))) {
                        missingFieldsUpdate.push(fieldId);
                    }
                });
            }
            if (missingFieldsUpdate.length > 0) {
                const uniqueMissing = [...new Set(missingFieldsUpdate)];
                logger_1.logger.warn(`Validation Error on update: Missing/empty required fields: ${uniqueMissing.join(', ')}.`);
                res.status(400).json({ success: false, message: `Missing or empty required fields for update: ${uniqueMissing.join(', ')}.` });
                return;
            }
            if (req.user?._id) {
                shipmentDataToUpdate.updatedBy = new mongoose_1.default.Types.ObjectId(req.user._id.toString());
            }
            else {
                const defaultUser = await User_1.User.findOne({ email: 'admin@example.com' }).select('_id').lean();
                if (defaultUser)
                    shipmentDataToUpdate.updatedBy = defaultUser._id;
            }
            if (shipmentDataToUpdate.hasOwnProperty('shipper')) {
                const shipperValue = shipmentDataToUpdate.shipper;
                if (typeof shipperValue === 'string') {
                    if (mongoose_1.default.Types.ObjectId.isValid(shipperValue)) {
                        shipmentDataToUpdate.shipper = new mongoose_1.default.Types.ObjectId(shipperValue);
                    }
                    else if (shipperValue.trim() === '') {
                        shipmentDataToUpdate.shipper = null;
                    }
                    else {
                        res.status(400).json({ success: false, message: "Invalid Shipper ID for update" });
                        return;
                    }
                }
                else if (shipperValue === null || shipperValue === undefined) {
                    shipmentDataToUpdate.shipper = null;
                }
            }
            if (shipmentDataToUpdate.hasOwnProperty('carrier')) {
                const carrierValue = shipmentDataToUpdate.carrier;
                if (typeof carrierValue === 'string') {
                    if (mongoose_1.default.Types.ObjectId.isValid(carrierValue)) {
                        shipmentDataToUpdate.carrier = new mongoose_1.default.Types.ObjectId(carrierValue);
                    }
                    else if (carrierValue.trim() === '') {
                        delete shipmentDataToUpdate.carrier;
                    }
                    else {
                        res.status(400).json({ success: false, message: "Invalid Carrier ID format for update" });
                        return;
                    }
                }
                else if (carrierValue === null || carrierValue === undefined) {
                    delete shipmentDataToUpdate.carrier;
                }
            }
            if (shipmentPayload.hasOwnProperty('otherReferenceNumbersString')) {
                if (typeof shipmentPayload.otherReferenceNumbersString === 'string' && shipmentPayload.otherReferenceNumbersString.trim() !== '') {
                    try {
                        shipmentDataToUpdate.otherReferenceNumbers = shipmentPayload.otherReferenceNumbersString.split(',')
                            .map((refStr) => { const parts = refStr.split(':'); const type = parts[0]?.trim(); const value = parts.slice(1).join(':')?.trim(); return { type, value }; })
                            .filter((ref) => ref.type && ref.value);
                    }
                    catch (e) {
                        logger_1.logger.warn("Could not parse otherReferenceNumbersString for update.", e);
                        shipmentDataToUpdate.otherReferenceNumbers = [];
                    }
                }
                else if (shipmentPayload.otherReferenceNumbersString === '') {
                    shipmentDataToUpdate.otherReferenceNumbers = [];
                }
            }
            else if (shipmentPayload.hasOwnProperty('otherReferenceNumbers') && Array.isArray(shipmentPayload.otherReferenceNumbers)) {
                shipmentDataToUpdate.otherReferenceNumbers = shipmentPayload.otherReferenceNumbers.filter((ref) => typeof ref === 'object' && ref.type && ref.value);
            }
            if (documentIds !== undefined) {
                if (Array.isArray(documentIds)) {
                    shipmentDataToUpdate.documents = documentIds.filter(docId => typeof docId === 'string' && mongoose_1.default.Types.ObjectId.isValid(docId)).map(docId => new mongoose_1.default.Types.ObjectId(docId));
                }
                else {
                    logger_1.logger.warn(`documentIds received for update of shipment ${id} but was not an array. Ignoring.`);
                    delete shipmentDataToUpdate.documents;
                }
            }
            if (accessorialsData !== undefined) {
                if (Array.isArray(accessorialsData)) {
                    shipmentDataToUpdate.accessorials = accessorialsData.map((acc) => ({
                        accessorialTypeId: new mongoose_1.default.Types.ObjectId(acc.accessorialTypeId), name: acc.name,
                        quantity: parseFloat(acc.quantity) || 1, customerRate: parseFloat(acc.customerRate) || 0,
                        carrierCost: parseFloat(acc.carrierCost) || 0, notes: acc.notes,
                        _id: acc._id && mongoose_1.default.Types.ObjectId.isValid(acc._id) ? new mongoose_1.default.Types.ObjectId(acc._id) : new mongoose_1.default.Types.ObjectId()
                    })).filter((acc) => mongoose_1.default.Types.ObjectId.isValid(acc.accessorialTypeId));
                }
                else if (accessorialsData === null) {
                    shipmentDataToUpdate.accessorials = [];
                }
                else {
                    delete shipmentDataToUpdate.accessorials;
                }
            }
            if (shipmentPayload.hasOwnProperty('fscType'))
                shipmentDataToUpdate.fscType = fscType === '' ? undefined : fscType;
            if (shipmentPayload.hasOwnProperty('fscCustomerAmount'))
                shipmentDataToUpdate.fscCustomerAmount = (fscCustomerAmount === '' || fscCustomerAmount === null) ? undefined : parseFloat(fscCustomerAmount);
            if (shipmentPayload.hasOwnProperty('fscCarrierAmount'))
                shipmentDataToUpdate.fscCarrierAmount = (fscCarrierAmount === '' || fscCarrierAmount === null) ? undefined : parseFloat(fscCarrierAmount);
            if (shipmentPayload.hasOwnProperty('chassisCustomerCost'))
                shipmentDataToUpdate.chassisCustomerCost = (chassisCustomerCost === '' || chassisCustomerCost === null) ? undefined : parseFloat(chassisCustomerCost);
            if (shipmentPayload.hasOwnProperty('chassisCarrierCost'))
                shipmentDataToUpdate.chassisCarrierCost = (chassisCarrierCost === '' || chassisCarrierCost === null) ? undefined : parseFloat(chassisCarrierCost);
            const dateFieldsToUpdate = ['lastFreeDayPort', 'lastFreeDayRail', 'emptyContainerReturnByDate', 'chassisReturnByDate', 'transloadDate', 'scheduledPickupDate', 'scheduledDeliveryDate', 'actualPickupDateTime', 'actualDeliveryDateTime', 'quoteValidUntil'];
            dateFieldsToUpdate.forEach(field => { if (shipmentDataToUpdate.hasOwnProperty(field)) {
                const dateString = shipmentDataToUpdate[field];
                if (dateString && typeof dateString === 'string') {
                    const dateVal = new Date(dateString);
                    if (!isNaN(dateVal.getTime()))
                        shipmentDataToUpdate[field] = dateVal;
                    else {
                        shipmentDataToUpdate[field] = undefined;
                    }
                }
                else if (dateString === null || dateString === '') {
                    shipmentDataToUpdate[field] = null;
                }
            } });
            delete shipmentDataToUpdate._id;
            const updatedShipmentDocument = await Shipment_1.Shipment.findByIdAndUpdate(id, { $set: shipmentDataToUpdate }, { new: true, runValidators: true });
            if (!updatedShipmentDocument) {
                res.status(404).json({ success: false, message: 'Shipment not found' });
                return;
            }
            logger_1.logger.info('Shipment updated successfully', { shipmentId: updatedShipmentDocument._id });
            const populatedShipment = await Shipment_1.Shipment.findById(updatedShipmentDocument._id)
                .populate({ path: 'shipper', select: 'name' }).populate({ path: 'carrier', select: 'name' })
                .populate({ path: 'createdBy', select: 'firstName lastName email' }).populate({ path: 'updatedBy', select: 'firstName lastName email' })
                .populate({ path: 'documents', select: 'originalName _id mimetype size createdAt path' })
                .populate({ path: 'accessorials.accessorialTypeId', select: 'name code unitName' })
                .lean();
            res.status(200).json({ success: true, data: populatedShipment, message: 'Shipment updated successfully' });
        }
        catch (error) {
            logger_1.logger.error('CRITICAL ERROR in updateShipment:', { message: error.message, name: error.name, stack: error.stack, shipmentId: id, requestBody: req.body, errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error), 2) });
            if (error.name === 'ValidationError')
                res.status(400).json({ success: false, message: error.message, errors: error.errors });
            else if (error.code === 11000)
                res.status(409).json({ success: false, message: `Duplicate key error on update. Field: ${JSON.stringify(error.keyValue)}`, errorDetails: error.keyValue });
            else
                res.status(500).json({ success: false, message: 'Error updating shipment', errorDetails: error.message });
        }
    }
    async getShipmentById(req, res) {
        const { id } = req.params;
        logger_1.logger.info(`Attempting to get shipment by ID: ${id}`);
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid shipment ID format.' });
            return;
        }
        try {
            const shipment = await Shipment_1.Shipment.findById(id)
                .populate({ path: 'shipper', select: 'name contact _id' })
                .populate({ path: 'carrier', select: 'name contact mcNumber dotNumber _id' })
                .populate({ path: 'createdBy', select: 'firstName lastName email _id' })
                .populate({ path: 'updatedBy', select: 'firstName lastName email _id' })
                .populate({ path: 'checkIns.createdBy', select: 'firstName lastName email _id' })
                .populate({ path: 'documents', select: 'originalName mimetype size createdAt path _id' })
                .populate({ path: 'accessorials.accessorialTypeId', model: 'AccessorialType', select: 'name code unitName defaultCustomerRate defaultCarrierCost' })
                .lean();
            if (!shipment) {
                res.status(404).json({ success: false, message: 'Shipment not found.' });
                return;
            }
            logger_1.logger.info(`Successfully fetched shipment ID: ${id}`);
            res.status(200).json({ success: true, data: shipment });
        }
        catch (error) {
            logger_1.logger.error(`Error fetching shipment by ID ${id}:`, { message: error.message, stack: error.stack });
            res.status(500).json({ success: false, message: 'Error fetching shipment details.', errorDetails: error.message });
        }
    }
    async addCheckIn(req, res) {
        const { id } = req.params;
        logger_1.logger.info(`Attempting to add check-in for shipment ID: ${id}`, { body: req.body });
        try {
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ success: false, message: 'Invalid shipment ID.' });
                return;
            }
            const checkInData = { ...req.body };
            if (!checkInData.method || !checkInData.notes || !checkInData.dateTime) {
                res.status(400).json({ success: false, message: "Date/Time, Method, and Notes are required for check-in." });
                return;
            }
            if (!checkInData.createdBy && req.user?._id) {
                checkInData.createdBy = req.user._id;
            }
            else if (!checkInData.createdBy) {
                const defaultUser = await User_1.User.findOne({ email: 'admin@example.com' }).select('_id').lean();
                if (defaultUser)
                    checkInData.createdBy = defaultUser._id.toString();
                else {
                    logger_1.logger.error("Cannot add check-in: createdBy field is missing and no default user found.");
                    res.status(400).json({ success: false, message: "User information missing for check-in." });
                    return;
                }
            }
            else if (typeof checkInData.createdBy === 'string' && mongoose_1.default.Types.ObjectId.isValid(checkInData.createdBy)) {
                checkInData.createdBy = new mongoose_1.default.Types.ObjectId(checkInData.createdBy);
            }
            const shipment = await Shipment_1.Shipment.findByIdAndUpdate(id, { $push: { checkIns: checkInData } }, { new: true, runValidators: true })
                .populate({ path: 'shipper', select: 'name' }).populate({ path: 'carrier', select: 'name' })
                .populate({ path: 'checkIns.createdBy', select: 'firstName lastName email' }).lean();
            if (!shipment) {
                res.status(404).json({ success: false, message: 'Shipment not found' });
                return;
            }
            logger_1.logger.info('Check-in added successfully for shipment ID:', id);
            res.status(200).json({ success: true, data: shipment, message: 'Check-in added successfully' });
        }
        catch (error) {
            logger_1.logger.error('CRITICAL ERROR in addCheckIn:', { message: error.message, name: error.name, stack: error.stack, params: req.params, body: req.body, errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error), 2) });
            res.status(500).json({ success: false, message: 'Error adding check-in', errorDetails: error.message });
        }
    }
    async deleteShipment(req, res) {
        const { id } = req.params;
        logger_1.logger.info(`Attempting to delete shipment/quote with ID: ${id}`);
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid ID format.' });
            return;
        }
        try {
            const shipment = await Shipment_1.Shipment.findById(id);
            if (!shipment) {
                res.status(404).json({ success: false, message: 'Shipment or Quote not found.' });
                return;
            }
            await Shipment_1.Shipment.findByIdAndDelete(id);
            logger_1.logger.info(`Shipment/Quote with ID: ${id} deleted successfully.`);
            res.status(200).json({ success: true, message: 'Shipment/Quote deleted successfully.' });
        }
        catch (error) {
            logger_1.logger.error('Error deleting shipment/quote:', { message: error.message, stack: error.stack, id });
            res.status(500).json({ success: false, message: 'Error deleting shipment/quote.', errorDetails: error.message });
        }
    }
    async generateStatusEmail(req, res) {
        const { id } = req.params;
        logger_1.logger.info(`Attempting to generate status email for shipment ID: ${id}`);
        try {
            const aiService = getAIEmailService();
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ success: false, message: 'Invalid shipment ID.' });
                return;
            }
            const shipment = await Shipment_1.Shipment.findById(id).populate({ path: 'shipper', select: 'name contact' }).populate({ path: 'carrier', select: 'name' }).lean();
            if (!shipment) {
                res.status(404).json({ success: false, message: 'Shipment not found' });
                return;
            }
            if (!process.env.OPENAI_API_KEY) {
                res.status(503).json({ success: false, message: 'AI Service not configured properly (Missing API Key).' });
                return;
            }
            const emailContent = await aiService.generateStatusUpdate(shipment);
            logger_1.logger.info('Status email content generated for shipment ID:', id);
            res.status(200).json({ success: true, data: { emailContent, shipmentNumber: shipment.shipmentNumber, shipmentForContext: shipment } });
        }
        catch (error) {
            logger_1.logger.error('CRITICAL ERROR in generateStatusEmail:', { message: error.message, name: error.name, stack: error.stack, params: req.params, errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error), 2) });
            if (error.message && (error.message.includes('API key') || error.message.includes('OpenAI') || error.message.includes('AIEmailService could not be initialized'))) {
                res.status(503).json({ success: false, message: 'Error with AI service.', errorDetails: error.message });
                return;
            }
            res.status(500).json({ success: false, message: 'Error generating status email', errorDetails: error.message });
        }
    }
    async updateShipmentTags(req, res) {
        const { id } = req.params;
        logger_1.logger.info(`Attempting to update tags for shipment ID: ${id}`, { body: req.body });
        try {
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ success: false, message: 'Invalid shipment ID.' });
                return;
            }
            const { tags } = req.body;
            if (!Array.isArray(tags)) {
                res.status(400).json({ success: false, message: 'Tags must be an array.' });
                return;
            }
            const shipment = await Shipment_1.Shipment.findByIdAndUpdate(id, { customTags: tags }, { new: true, runValidators: true }).lean();
            if (!shipment) {
                res.status(404).json({ success: false, message: 'Shipment not found' });
                return;
            }
            logger_1.logger.info('Tags updated successfully for shipment ID:', id);
            res.status(200).json({ success: true, data: shipment, message: 'Tags updated successfully' });
        }
        catch (error) {
            logger_1.logger.error('CRITICAL ERROR in updateShipmentTags:', { message: error.message, name: error.name, stack: error.stack, params: req.params, body: req.body, errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error), 2) });
            res.status(500).json({ success: false, message: 'Error updating tags', errorDetails: error.message });
        }
    }
}
exports.ShipmentController = ShipmentController;
//# sourceMappingURL=shipmentController.js.map