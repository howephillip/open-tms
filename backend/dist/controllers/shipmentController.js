"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShipmentController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Shipment_1 = require("../models/Shipment");
const User_1 = require("../models/User");
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
    return sortOptions;
};
class ShipmentController {
    async createShipment(req, res) {
        logger_1.logger.info('Attempting to create shipment with body:', JSON.stringify(req.body, null, 2));
        try {
            const { documentIds, accessorials: accessorialsData, fscType, fscCustomerAmount, fscCarrierAmount, ...shipmentPayload } = req.body;
            const { shipper, carrier, modeOfTransport, origin, destination, scheduledPickupDate, scheduledDeliveryDate, equipmentType, commodityDescription, customerRate, carrierCostTotal, createdBy } = shipmentPayload;
            if (!shipper || !carrier || !modeOfTransport || !origin || !destination ||
                !scheduledPickupDate || !scheduledDeliveryDate || !equipmentType || !commodityDescription ||
                customerRate === undefined || carrierCostTotal === undefined || !createdBy) {
                let missing = [];
                if (!shipper)
                    missing.push('shipper');
                if (!carrier)
                    missing.push('carrier');
                if (!createdBy)
                    missing.push('createdBy');
                logger_1.logger.warn(`Validation Error: Missing core required fields for shipment creation. Missing: ${missing.join(', ') || 'various'}`);
                res.status(400).json({ success: false, message: `Missing core required fields. Ensure all primary details and creator info are provided.` });
                return;
            }
            const shipmentData = { ...shipmentPayload };
            if (shipmentData.shipper && typeof shipmentData.shipper === 'string' && mongoose_1.default.Types.ObjectId.isValid(shipmentData.shipper)) {
                shipmentData.shipper = new mongoose_1.default.Types.ObjectId(shipmentData.shipper);
            }
            else if (shipmentData.shipper && typeof shipmentData.shipper === 'string') {
                logger_1.logger.warn(`Invalid shipper ID: ${shipmentData.shipper}`);
                res.status(400).json({ success: false, message: 'Invalid shipper ID format.' });
                return;
            }
            if (shipmentData.carrier && typeof shipmentData.carrier === 'string' && mongoose_1.default.Types.ObjectId.isValid(shipmentData.carrier)) {
                shipmentData.carrier = new mongoose_1.default.Types.ObjectId(shipmentData.carrier);
            }
            else if (shipmentData.carrier && typeof shipmentData.carrier === 'string') {
                logger_1.logger.warn(`Invalid carrier ID: ${shipmentData.carrier}`);
                res.status(400).json({ success: false, message: 'Invalid carrier ID format.' });
                return;
            }
            if (shipmentData.createdBy && typeof shipmentData.createdBy === 'string' && mongoose_1.default.Types.ObjectId.isValid(shipmentData.createdBy)) {
                shipmentData.createdBy = new mongoose_1.default.Types.ObjectId(shipmentData.createdBy);
            }
            else if (shipmentData.createdBy && typeof shipmentData.createdBy === 'string') {
                logger_1.logger.warn(`Invalid createdBy ID: ${shipmentData.createdBy}`);
                res.status(400).json({ success: false, message: 'Invalid createdBy ID format.' });
                return;
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
            // Handle FSC Fields
            if (fscType !== undefined && fscType !== '')
                shipmentData.fscType = fscType;
            if (fscCustomerAmount !== undefined && fscCustomerAmount !== null && fscCustomerAmount !== '')
                shipmentData.fscCustomerAmount = parseFloat(fscCustomerAmount);
            if (fscCarrierAmount !== undefined && fscCarrierAmount !== null && fscCarrierAmount !== '')
                shipmentData.fscCarrierAmount = parseFloat(fscCarrierAmount);
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
            if (error.name === 'ValidationError')
                res.status(400).json({ success: false, message: error.message, errors: error.errors });
            else if (error.code === 11000)
                res.status(409).json({ success: false, message: `Duplicate key error. Field: ${JSON.stringify(error.keyValue)}`, errorDetails: error.keyValue });
            else
                res.status(500).json({ success: false, message: 'Error creating shipment', errorDetails: error.message });
        }
    }
    async getShipments(req, res) {
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
            const { status, statusesNotIn, // Added statusesNotIn
            tags, shipper, carrier, startDate, endDate, shipmentNumber, modeOfTransport, containerNumber, deliveryOrderNumber, proNumber, billOfLadingNumber, purchaseOrderNumbers, searchTerm } = req.query;
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
                const projectStage = { $project: { _id: 1, shipmentNumber: 1, billOfLadingNumber: 1, proNumber: 1, deliveryOrderNumber: 1, bookingNumber: 1, containerNumber: 1, sealNumber: 1, pickupNumber: 1, proofOfDeliveryNumber: 1, purchaseOrderNumbers: 1, otherReferenceNumbers: 1, shipper: { _id: '$shipperDoc._id', name: '$shipperDoc.name', contact: '$shipperDoc.contact' }, carrier: { _id: '$carrierDoc._id', name: '$carrierDoc.name', mcNumber: '$carrierDoc.mcNumber', dotNumber: '$carrierDoc.dotNumber', contact: '$carrierDoc.contact' }, consignee: 1, billTo: 1, modeOfTransport: 1, steamshipLine: 1, vesselName: 1, voyageNumber: 1, terminal: 1, lastFreeDayPort: 1, lastFreeDayRail: 1, emptyReturnDepot: 1, emptyContainerReturnByDate: 1, chassisNumber: 1, chassisType: 1, chassisProvider: 1, chassisReturnByDate: 1, railOriginRamp: 1, railDestinationRamp: 1, railCarrier: 1, airline: 1, flightNumber: 1, masterAirWaybill: 1, houseAirWaybill: 1, airportOfDeparture: 1, airportOfArrival: 1, isTransload: 1, transloadFacility: 1, transloadDate: 1, origin: 1, destination: 1, scheduledPickupDate: 1, scheduledPickupTime: 1, pickupAppointmentNumber: 1, actualPickupDateTime: 1, scheduledDeliveryDate: 1, scheduledDeliveryTime: 1, deliveryAppointmentNumber: 1, actualDeliveryDateTime: 1, status: 1, equipmentType: 1, equipmentLength: 1, equipmentUnit: 1, commodityDescription: 1, pieceCount: 1, packageType: 1, totalWeight: 1, weightUnit: 1, isHazardous: 1, unNumber: 1, hazmatClass: 1, isTemperatureControlled: 1, temperatureMin: 1, temperatureMax: 1, tempUnit: 1, customerRate: 1, carrierCostTotal: 1, grossProfit: 1, margin: 1, internalNotes: 1, specialInstructions: 1, customTags: 1, checkIns: 1, documents: 1, createdBy: { _id: '$createdByUserDoc._id', firstName: '$createdByUserDoc.firstName', lastName: '$createdByUserDoc.lastName', email: '$createdByUserDoc.email' }, createdAt: 1, updatedAt: 1, fscType: 1, fscCustomerAmount: 1, fscCarrierAmount: 1, totalCustomerRate: 1, totalCarrierCost: 1 } }; // Added FSC fields
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
            const { documentIds, accessorials: accessorialsData, fscType, fscCustomerAmount, fscCarrierAmount, ...shipmentPayload } = req.body;
            const shipmentDataToUpdate = { ...shipmentPayload };
            if (req.user) {
                shipmentDataToUpdate.updatedBy = req.user._id;
            }
            else {
                const defaultUser = await User_1.User.findOne({ email: 'admin@example.com' }).select('_id');
                if (defaultUser)
                    shipmentDataToUpdate.updatedBy = defaultUser._id;
            }
            if (shipmentDataToUpdate.shipper && typeof shipmentDataToUpdate.shipper === 'string' && mongoose_1.default.Types.ObjectId.isValid(shipmentDataToUpdate.shipper)) {
                shipmentDataToUpdate.shipper = new mongoose_1.default.Types.ObjectId(shipmentDataToUpdate.shipper);
            }
            else if (shipmentDataToUpdate.shipper === '' || shipmentDataToUpdate.shipper === null) {
                shipmentDataToUpdate.shipper = null;
            }
            else if (shipmentDataToUpdate.shipper && typeof shipmentDataToUpdate.shipper === 'string') {
                res.status(400).json({ success: false, message: "Invalid Shipper ID for update" });
                return;
            }
            if (shipmentDataToUpdate.carrier && typeof shipmentDataToUpdate.carrier === 'string' && mongoose_1.default.Types.ObjectId.isValid(shipmentDataToUpdate.carrier)) {
                shipmentDataToUpdate.carrier = new mongoose_1.default.Types.ObjectId(shipmentDataToUpdate.carrier);
            }
            else if (shipmentDataToUpdate.carrier === '' || shipmentDataToUpdate.carrier === null) {
                shipmentDataToUpdate.carrier = null;
            }
            else if (shipmentDataToUpdate.carrier && typeof shipmentDataToUpdate.carrier === 'string') {
                res.status(400).json({ success: false, message: "Invalid Carrier ID for update" });
                return;
            }
            if (shipmentPayload.otherReferenceNumbersString && typeof shipmentPayload.otherReferenceNumbersString === 'string') {
                try {
                    shipmentDataToUpdate.otherReferenceNumbers = shipmentPayload.otherReferenceNumbersString.split(',')
                        .map((refStr) => { const parts = refStr.split(':'); const type = parts[0]?.trim(); const value = parts.slice(1).join(':')?.trim(); return { type, value }; })
                        .filter((ref) => ref.type && ref.value);
                }
                catch (e) {
                    logger_1.logger.warn("Could not parse otherReferenceNumbersString for update.", e);
                }
            }
            else if (Array.isArray(shipmentPayload.otherReferenceNumbers)) {
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
                        _id: acc._id ? new mongoose_1.default.Types.ObjectId(acc._id) : new mongoose_1.default.Types.ObjectId()
                    })).filter((acc) => mongoose_1.default.Types.ObjectId.isValid(acc.accessorialTypeId));
                }
                else {
                    delete shipmentDataToUpdate.accessorials;
                }
            }
            // Handle FSC Fields for Update
            if (fscType !== undefined)
                shipmentDataToUpdate.fscType = fscType === '' ? undefined : fscType;
            if (fscCustomerAmount !== undefined)
                shipmentDataToUpdate.fscCustomerAmount = (fscCustomerAmount === '' || fscCustomerAmount === null) ? undefined : parseFloat(fscCustomerAmount);
            if (fscCarrierAmount !== undefined)
                shipmentDataToUpdate.fscCarrierAmount = (fscCarrierAmount === '' || fscCarrierAmount === null) ? undefined : parseFloat(fscCarrierAmount);
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
            const updatedShipment = await Shipment_1.Shipment.findByIdAndUpdate(id, { $set: shipmentDataToUpdate }, { new: true, runValidators: true })
                .populate({ path: 'shipper', select: 'name' }).populate({ path: 'carrier', select: 'name' })
                .populate({ path: 'createdBy', select: 'firstName lastName email' }).populate({ path: 'updatedBy', select: 'firstName lastName email' })
                .populate({ path: 'documents', select: 'originalName _id mimetype size createdAt path' })
                .populate({ path: 'accessorials.accessorialTypeId', select: 'name code unitName' })
                .lean();
            if (!updatedShipment) {
                res.status(404).json({ success: false, message: 'Shipment not found' });
                return;
            }
            logger_1.logger.info('Shipment updated successfully', { shipmentId: updatedShipment._id });
            res.status(200).json({ success: true, data: updatedShipment, message: 'Shipment updated successfully' });
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
                return res.status(400).json({ success: false, message: "Date/Time, Method, and Notes are required for check-in." });
            }
            if (!checkInData.createdBy && req.user) {
                checkInData.createdBy = req.user._id;
            }
            else if (!checkInData.createdBy) {
                const defaultUser = await User_1.User.findOne({ email: 'admin@example.com' }).select('_id');
                if (defaultUser)
                    checkInData.createdBy = defaultUser._id;
                else {
                    logger_1.logger.error("Cannot add check-in: createdBy field is missing and no default user found.");
                    return res.status(400).json({ success: false, message: "User information missing for check-in." });
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
                return res.status(503).json({ success: false, message: 'AI Service not configured properly (Missing API Key).' });
            }
            const emailContent = await aiService.generateStatusUpdate(shipment);
            logger_1.logger.info('Status email content generated for shipment ID:', id);
            res.status(200).json({ success: true, data: { emailContent, shipmentNumber: shipment.shipmentNumber, shipmentForContext: shipment } });
        }
        catch (error) {
            logger_1.logger.error('CRITICAL ERROR in generateStatusEmail:', { message: error.message, name: error.name, stack: error.stack, params: req.params, errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error), 2) });
            if (error.message && (error.message.includes('API key') || error.message.includes('OpenAI') || error.message.includes('AIEmailService could not be initialized'))) {
                return res.status(503).json({ success: false, message: 'Error with AI service.', errorDetails: error.message });
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