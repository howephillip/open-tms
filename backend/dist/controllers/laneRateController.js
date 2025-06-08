"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaneRateController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const LaneRate_1 = require("../models/LaneRate");
const User_1 = require("../models/User"); // IMPORT IUser
const logger_1 = require("../utils/logger");
const parseSortQuery = (sortQueryString, defaultSort = { rateDate: -1 }) => {
    // ... (implementation)
    if (!sortQueryString)
        return defaultSort;
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
class LaneRateController {
    async getLaneRateSummary(req, res) {
        // ... (implementation from previous correct version)
        logger_1.logger.info('Fetching lane rate summary. Query:', req.query);
        try {
            const { modeOfTransport, equipmentType, carrierId, searchTerm } = req.query;
            const matchStage = { isActive: true };
            if (modeOfTransport && typeof modeOfTransport === 'string' && modeOfTransport !== '') {
                matchStage.modeOfTransport = modeOfTransport;
            }
            if (equipmentType && typeof equipmentType === 'string' && equipmentType !== '') {
                matchStage.equipmentType = { $regex: equipmentType, $options: 'i' };
            }
            if (carrierId && typeof carrierId === 'string' && mongoose_1.default.Types.ObjectId.isValid(carrierId)) {
                matchStage.carrier = new mongoose_1.default.Types.ObjectId(carrierId);
            }
            if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim() !== '') {
                const searchStr = searchTerm.trim();
                const searchRegex = { $regex: searchStr, $options: 'i' };
                const searchOrConditions = [
                    { originCity: searchRegex }, { originState: searchRegex }, { originZip: searchRegex },
                    { destinationCity: searchRegex }, { destinationState: searchRegex }, { destinationZip: searchRegex },
                    { modeOfTransport: searchRegex }, { equipmentType: searchRegex },
                    { sourceQuoteShipmentNumber: searchRegex },
                ];
                const existingFilterKeys = Object.keys(matchStage).filter(k => k !== 'isActive');
                if (existingFilterKeys.length > 0) {
                    const currentFilters = { ...matchStage };
                    delete currentFilters.$and;
                    matchStage.$and = [currentFilters, { $or: searchOrConditions }];
                }
                else {
                    matchStage.$or = searchOrConditions;
                }
            }
            logger_1.logger.info('Lane Rate Summary Match Stage:', JSON.stringify(matchStage));
            const laneSummary = await LaneRate_1.LaneRate.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: {
                            originCity: '$originCity',
                            originState: '$originState',
                            destinationCity: '$destinationCity',
                            destinationState: '$destinationState',
                        },
                        minLineHaulCost: { $min: '$lineHaulCost' },
                        maxLineHaulCost: { $max: '$lineHaulCost' },
                        avgLineHaulCost: { $avg: '$lineHaulCost' },
                        avgFscPercentage: { $avg: '$fscPercentage' },
                        minChassisCostCarrier: { $min: '$chassisCostCarrier' },
                        maxChassisCostCarrier: { $max: '$chassisCostCarrier' },
                        avgChassisCostCarrier: { $avg: '$chassisCostCarrier' },
                        entryCount: { $sum: 1 },
                        lastQuotedDate: { $max: '$rateDate' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        originCity: '$_id.originCity',
                        originState: '$_id.originState',
                        destinationCity: '$_id.destinationCity',
                        destinationState: '$_id.destinationState',
                        minLineHaulCost: { $ifNull: ['$minLineHaulCost', null] },
                        maxLineHaulCost: { $ifNull: ['$maxLineHaulCost', null] },
                        avgLineHaulCost: { $ifNull: [{ $round: ['$avgLineHaulCost', 2] }, null] },
                        avgFscPercentage: { $ifNull: [{ $round: ['$avgFscPercentage', 2] }, null] },
                        minChassisCostCarrier: { $ifNull: ['$minChassisCostCarrier', null] },
                        maxChassisCostCarrier: { $ifNull: ['$maxChassisCostCarrier', null] },
                        avgChassisCostCarrier: { $ifNull: [{ $round: ['$avgChassisCostCarrier', 2] }, null] },
                        entryCount: '$entryCount',
                        lastQuotedDate: '$lastQuotedDate'
                    }
                },
                { $sort: { originState: 1, originCity: 1, destinationState: 1, destinationCity: 1 } }
            ]);
            logger_1.logger.info(`Lane rate summary fetched. Count: ${laneSummary.length}`);
            res.status(200).json({ success: true, data: laneSummary });
        }
        catch (error) {
            logger_1.logger.error('Error fetching lane rate summary:', { message: error.message, stack: error.stack });
            res.status(500).json({ success: false, message: 'Error fetching lane rate summary', errorDetails: error.message });
        }
    }
    async getLaneRateDetail(req, res) {
        const { originCity, originState, destinationCity, destinationState, originZip, destinationZip, carrierId, modeOfTransport, equipmentType, page = '1', limit = '25', sort = '-rateDate' } = req.query;
        logger_1.logger.info('Fetching lane rate details. Query:', req.query);
        if (!originCity || !originState || !destinationCity || !destinationState) {
            res.status(400).json({ success: false, message: 'Origin and destination city/state are required for lane detail.' });
            return;
        }
        try {
            const pageNum = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            const sortOptions = parseSortQuery(sort);
            const query = {
                originCity: originCity,
                originState: originState,
                destinationCity: destinationCity,
                destinationState: destinationState,
                isActive: true,
            };
            if (originZip && typeof originZip === 'string')
                query.originZip = originZip;
            if (destinationZip && typeof destinationZip === 'string')
                query.destinationZip = destinationZip;
            if (carrierId && typeof carrierId === 'string' && mongoose_1.default.Types.ObjectId.isValid(carrierId)) {
                query.carrier = new mongoose_1.default.Types.ObjectId(carrierId);
            }
            if (modeOfTransport && typeof modeOfTransport === 'string')
                query.modeOfTransport = modeOfTransport;
            if (equipmentType && typeof equipmentType === 'string')
                query.equipmentType = { $regex: equipmentType, $options: 'i' };
            const laneRates = await LaneRate_1.LaneRate.find(query)
                .populate('carrier', 'name mcNumber')
                .populate('createdBy', 'firstName lastName email')
                .populate('updatedBy', 'firstName lastName email')
                .populate({
                path: 'sourceShipmentId',
                select: 'shipmentNumber status accessorials',
                populate: {
                    path: 'accessorials.accessorialTypeId',
                    model: 'AccessorialType',
                    select: 'name code'
                }
            })
                .sort(sortOptions)
                .limit(limitNum)
                .skip((pageNum - 1) * limitNum)
                .lean();
            const total = await LaneRate_1.LaneRate.countDocuments(query);
            const processedLaneRates = laneRates.map(lr => {
                let displayAccessorials = [];
                const sourceShipment = lr.sourceShipmentId;
                if (lr.sourceType === 'MANUAL_ENTRY' && lr.manualAccessorials && lr.manualAccessorials.length > 0) {
                    displayAccessorials = lr.manualAccessorials.map(ma => ({
                        _id: ma._id?.toString(),
                        name: ma.name || 'Unnamed Accessorial',
                        cost: ma.cost || 0,
                        notes: ma.notes
                    }));
                }
                else if (lr.sourceType === 'TMS_SHIPMENT' && sourceShipment && Array.isArray(sourceShipment.accessorials)) {
                    displayAccessorials = sourceShipment.accessorials.map((sa) => {
                        let accName = 'Unknown Accessorial';
                        if (sa.accessorialTypeId && typeof sa.accessorialTypeId === 'object' && 'name' in sa.accessorialTypeId) {
                            accName = sa.accessorialTypeId.name || accName;
                        }
                        else if (sa.name) {
                            accName = sa.name;
                        }
                        return {
                            _id: sa._id?.toString(),
                            name: accName,
                            cost: (sa.carrierCost || 0) * (sa.quantity || 1),
                            notes: sa.notes
                        };
                    });
                }
                return { ...lr, displayAccessorials };
            });
            res.status(200).json({
                success: true,
                data: {
                    laneRates: processedLaneRates,
                    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching lane rate details:', { message: error.message, stack: error.stack, query: req.query });
            res.status(500).json({ success: false, message: 'Error fetching lane rate details', errorDetails: error.message });
        }
    }
    async getLaneRatesByCarrier(req, res) {
        const { carrierId } = req.params;
        const { page = '1', limit = '25', sort = '-rateDate' } = req.query;
        logger_1.logger.info(`Fetching lane rates for carrier ID: ${carrierId}. Query:`, req.query);
        if (!mongoose_1.default.Types.ObjectId.isValid(carrierId)) {
            res.status(400).json({ success: false, message: 'Invalid carrier ID format.' });
            return;
        }
        try {
            const pageNum = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            const sortOptions = parseSortQuery(sort);
            const query = { carrier: new mongoose_1.default.Types.ObjectId(carrierId), isActive: true };
            const laneRates = await LaneRate_1.LaneRate.find(query)
                .populate('createdBy', 'firstName lastName')
                .populate('updatedBy', 'firstName lastName email')
                .populate({
                path: 'sourceShipmentId',
                select: 'shipmentNumber status accessorials',
                populate: {
                    path: 'accessorials.accessorialTypeId',
                    model: 'AccessorialType',
                    select: 'name code'
                }
            })
                .sort(sortOptions)
                .limit(limitNum)
                .skip((pageNum - 1) * limitNum)
                .lean();
            const total = await LaneRate_1.LaneRate.countDocuments(query);
            const processedLaneRates = laneRates.map(lr => {
                let displayAccessorials = [];
                const sourceShipment = lr.sourceShipmentId;
                if (lr.sourceType === 'MANUAL_ENTRY' && lr.manualAccessorials && lr.manualAccessorials.length > 0) {
                    displayAccessorials = lr.manualAccessorials.map(ma => ({ _id: ma._id?.toString(), name: ma.name || 'Unnamed', cost: ma.cost || 0, notes: ma.notes }));
                }
                else if (lr.sourceType === 'TMS_SHIPMENT' && sourceShipment && Array.isArray(sourceShipment.accessorials)) {
                    displayAccessorials = sourceShipment.accessorials.map((sa) => {
                        let accName = 'Unknown Accessorial';
                        if (sa.accessorialTypeId && typeof sa.accessorialTypeId === 'object' && 'name' in sa.accessorialTypeId) {
                            accName = sa.accessorialTypeId.name || accName;
                        }
                        else if (sa.name) {
                            accName = sa.name;
                        }
                        return {
                            _id: sa._id?.toString(),
                            name: accName,
                            cost: (sa.carrierCost || 0) * (sa.quantity || 1),
                            notes: sa.notes
                        };
                    });
                }
                return { ...lr, displayAccessorials };
            });
            res.status(200).json({
                success: true,
                data: {
                    laneRates: processedLaneRates,
                    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
                }
            });
        }
        catch (error) {
            logger_1.logger.error(`Error fetching lane rates for carrier ${carrierId}:`, { message: error.message, stack: error.stack });
            res.status(500).json({ success: false, message: 'Error fetching carrier lane rates.', errorDetails: error.message });
        }
    }
    async createManualLaneRate(req, res) {
        logger_1.logger.info('Attempting to create manual lane rate:', req.body);
        try {
            const { originCity, originState, destinationCity, destinationState, carrier, lineHaulCost, modeOfTransport, originZip, destinationZip, lineHaulRate, fscPercentage, chassisCostCarrier, chassisCostCustomer, manualAccessorials, rateDate, rateValidUntil, equipmentType, notes } = req.body;
            let createdByUserId = req.body.createdBy;
            if (!createdByUserId && req.user?._id) {
                createdByUserId = req.user._id.toString();
            }
            else if (!createdByUserId) {
                const defaultUser = await User_1.User.findOne({ email: 'admin@example.com' }).select('_id').lean();
                if (defaultUser) {
                    createdByUserId = defaultUser._id.toString();
                }
                else {
                    logger_1.logger.error('CRITICAL: createdBy field missing for manual lane rate and no default user found.');
                    res.status(400).json({ success: false, message: 'User context (createdBy) is missing and no default available.' });
                    return;
                }
            }
            const missing = [];
            if (!originCity)
                missing.push('originCity');
            if (!originState)
                missing.push('originState');
            if (!destinationCity)
                missing.push('destinationCity');
            if (!destinationState)
                missing.push('destinationState');
            if (!carrier)
                missing.push('carrier (ID)');
            if (lineHaulCost === undefined || lineHaulCost === null || lineHaulCost === '')
                missing.push('lineHaulCost');
            if (!modeOfTransport)
                missing.push('modeOfTransport');
            if (!createdByUserId)
                missing.push('createdBy (user ID)');
            if (missing.length > 0) {
                logger_1.logger.warn(`Validation failed for manual lane rate creation. Missing: ${missing.join(', ')}`, { body: req.body });
                res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}.` });
                return;
            }
            if (!mongoose_1.default.Types.ObjectId.isValid(carrier)) {
                res.status(400).json({ success: false, message: 'Invalid Carrier ID format.' });
                return;
            }
            if (!mongoose_1.default.Types.ObjectId.isValid(createdByUserId)) {
                res.status(400).json({ success: false, message: 'Invalid Created By User ID format.' });
                return;
            }
            const laneRateEntryData = {
                originCity, originState, destinationCity, destinationState,
                carrier: new mongoose_1.default.Types.ObjectId(carrier),
                lineHaulCost: parseFloat(lineHaulCost),
                modeOfTransport,
                createdBy: new mongoose_1.default.Types.ObjectId(createdByUserId),
                sourceType: 'MANUAL_ENTRY',
                isActive: true,
                originZip: originZip || undefined,
                destinationZip: destinationZip || undefined,
                lineHaulRate: (lineHaulRate !== undefined && lineHaulRate !== null && lineHaulRate !== '') ? parseFloat(lineHaulRate) : undefined,
                fscPercentage: (fscPercentage !== undefined && fscPercentage !== null && fscPercentage !== '') ? parseFloat(fscPercentage) : undefined,
                chassisCostCarrier: (chassisCostCarrier !== undefined && chassisCostCarrier !== null && chassisCostCarrier !== '') ? parseFloat(chassisCostCarrier) : undefined,
                chassisCostCustomer: (chassisCostCustomer !== undefined && chassisCostCustomer !== null && chassisCostCustomer !== '') ? parseFloat(chassisCostCustomer) : undefined,
                rateDate: rateDate ? new Date(rateDate) : new Date(),
                rateValidUntil: rateValidUntil ? new Date(rateValidUntil) : undefined,
                equipmentType: equipmentType || undefined,
                notes: notes || undefined,
                manualAccessorials: [],
            };
            if (Array.isArray(manualAccessorials) && manualAccessorials.length > 0) {
                laneRateEntryData.manualAccessorials = manualAccessorials
                    .filter(acc => typeof acc.name === 'string' && acc.name.trim() !== '' && acc.cost !== undefined && acc.cost !== null)
                    .map(acc => ({
                    _id: acc._id && mongoose_1.default.Types.ObjectId.isValid(acc._id) ? new mongoose_1.default.Types.ObjectId(acc._id) : new mongoose_1.default.Types.ObjectId(),
                    name: acc.name.trim(),
                    cost: parseFloat(String(acc.cost)),
                    notes: acc.notes || undefined,
                }));
            }
            const newLaneRate = new LaneRate_1.LaneRate(laneRateEntryData);
            await newLaneRate.save();
            logger_1.logger.info('Manual lane rate created successfully:', newLaneRate._id);
            const populatedLaneRate = await LaneRate_1.LaneRate.findById(newLaneRate._id)
                .populate('carrier', 'name mcNumber')
                .populate('createdBy', 'firstName lastName email')
                .lean();
            res.status(201).json({ success: true, data: populatedLaneRate, message: 'Manual lane rate created.' });
        }
        catch (error) {
            logger_1.logger.error('Error creating manual lane rate:', { message: error.message, body: req.body, stack: error.stack });
            if (error.name === 'ValidationError') {
                res.status(400).json({ success: false, message: error.message, errors: error.errors });
            }
            else {
                res.status(500).json({ success: false, message: 'Error creating manual lane rate.' });
            }
        }
    }
    async updateManualLaneRate(req, res) {
        const { id } = req.params;
        logger_1.logger.info(`Attempting to update lane rate ID: ${id}`, { body: req.body });
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid LaneRate ID format.' });
            return;
        }
        try {
            const existingLaneRate = await LaneRate_1.LaneRate.findById(id);
            if (!existingLaneRate) {
                res.status(404).json({ success: false, message: 'Lane rate entry not found.' });
                return;
            }
            const { originCity, originState, destinationCity, destinationState, carrier, lineHaulCost, modeOfTransport, originZip, destinationZip, lineHaulRate, fscPercentage, chassisCostCarrier, chassisCostCustomer, manualAccessorials, rateDate, rateValidUntil, equipmentType, notes, isActive } = req.body;
            const coreUpdateMissing = [];
            if (originCity === '')
                coreUpdateMissing.push('originCity');
            if (originState === '')
                coreUpdateMissing.push('originState');
            if (destinationCity === '')
                coreUpdateMissing.push('destinationCity');
            if (destinationState === '')
                coreUpdateMissing.push('destinationState');
            if (carrier === '')
                coreUpdateMissing.push('carrier');
            if (lineHaulCost === '' || lineHaulCost === null || lineHaulCost === undefined)
                coreUpdateMissing.push('lineHaulCost');
            if (modeOfTransport === '')
                coreUpdateMissing.push('modeOfTransport');
            if (coreUpdateMissing.length > 0) {
                logger_1.logger.warn(`Validation failed for lane rate update. Core fields cannot be empty. ID: ${id}. Missing: ${coreUpdateMissing.join(', ')}`);
                res.status(400).json({ success: false, message: `Core fields cannot be empty: ${coreUpdateMissing.join(', ')}.` });
                return;
            }
            if (carrier && !mongoose_1.default.Types.ObjectId.isValid(carrier)) {
                res.status(400).json({ success: false, message: 'Invalid Carrier ID format for update.' });
                return;
            }
            existingLaneRate.originCity = originCity;
            existingLaneRate.originState = originState;
            existingLaneRate.destinationCity = destinationCity;
            existingLaneRate.destinationState = destinationState;
            if (carrier)
                existingLaneRate.carrier = new mongoose_1.default.Types.ObjectId(carrier);
            existingLaneRate.lineHaulCost = parseFloat(lineHaulCost);
            existingLaneRate.modeOfTransport = modeOfTransport;
            existingLaneRate.originZip = originZip || undefined;
            existingLaneRate.destinationZip = destinationZip || undefined;
            existingLaneRate.lineHaulRate = (lineHaulRate !== 0 && lineHaulRate !== null && lineHaulRate !== '') ? parseFloat(lineHaulRate) : undefined;
            existingLaneRate.fscPercentage = (fscPercentage !== undefined && fscPercentage !== null && fscPercentage !== '') ? parseFloat(fscPercentage) : undefined;
            existingLaneRate.chassisCostCarrier = (chassisCostCarrier !== undefined && chassisCostCarrier !== null && chassisCostCarrier !== '') ? parseFloat(chassisCostCarrier) : undefined;
            existingLaneRate.chassisCostCustomer = (chassisCostCustomer !== undefined && chassisCostCustomer !== null && chassisCostCustomer !== '') ? parseFloat(chassisCostCustomer) : undefined;
            existingLaneRate.rateDate = rateDate ? new Date(rateDate) : existingLaneRate.rateDate;
            existingLaneRate.rateValidUntil = rateValidUntil ? new Date(rateValidUntil) : undefined;
            existingLaneRate.equipmentType = equipmentType || undefined;
            existingLaneRate.notes = notes || undefined;
            if (isActive !== undefined)
                existingLaneRate.isActive = isActive;
            if (Array.isArray(manualAccessorials)) {
                existingLaneRate.manualAccessorials = manualAccessorials
                    .filter(acc => typeof acc.name === 'string' && acc.name.trim() !== '' && acc.cost !== undefined && acc.cost !== null && acc.cost !== '')
                    .map(acc => ({
                    _id: acc._id && mongoose_1.default.Types.ObjectId.isValid(acc._id) ? new mongoose_1.default.Types.ObjectId(acc._id) : new mongoose_1.default.Types.ObjectId(),
                    name: acc.name.trim(),
                    cost: parseFloat(String(acc.cost)),
                    notes: acc.notes || undefined,
                }));
            }
            else if (manualAccessorials === null || (Array.isArray(manualAccessorials) && manualAccessorials.length === 0)) {
                existingLaneRate.manualAccessorials = [];
            }
            if (req.user?._id && mongoose_1.default.Types.ObjectId.isValid(req.user._id.toString())) {
                existingLaneRate.updatedBy = new mongoose_1.default.Types.ObjectId(req.user._id.toString());
            }
            await existingLaneRate.save();
            logger_1.logger.info('Lane rate updated successfully:', existingLaneRate._id);
            const populatedLaneRate = await LaneRate_1.LaneRate.findById(existingLaneRate._id)
                .populate('carrier', 'name mcNumber')
                .populate('createdBy', 'firstName lastName email')
                .populate('updatedBy', 'firstName lastName email')
                .lean();
            res.status(200).json({ success: true, data: populatedLaneRate, message: 'Lane rate updated.' });
        }
        catch (error) {
            logger_1.logger.error('Error updating lane rate:', { message: error.message, id: id, body: req.body, stack: error.stack });
            if (error.name === 'ValidationError') {
                res.status(400).json({ success: false, message: error.message, errors: error.errors });
            }
            else {
                res.status(500).json({ success: false, message: 'Error updating lane rate.' });
            }
        }
    }
    async deleteLaneRate(req, res) {
        const { id } = req.params;
        logger_1.logger.info(`Attempting to delete lane rate with ID: ${id}`);
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid LaneRate ID format.' });
            return;
        }
        try {
            const result = await LaneRate_1.LaneRate.findByIdAndDelete(id);
            if (!result) {
                res.status(404).json({ success: false, message: 'Lane rate entry not found.' });
                return;
            }
            logger_1.logger.info(`Lane rate entry with ID: ${id} deleted successfully.`);
            res.status(200).json({ success: true, message: 'Lane rate entry deleted successfully.' });
        }
        catch (error) {
            logger_1.logger.error('Error deleting lane rate entry:', { message: error.message, stack: error.stack, id: id });
            res.status(500).json({ success: false, message: 'Error deleting lane rate entry.', errorDetails: error.message });
        }
    }
}
exports.LaneRateController = LaneRateController;
//# sourceMappingURL=laneRateController.js.map