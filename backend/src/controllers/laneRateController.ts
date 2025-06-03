// File: backend/src/controllers/laneRateController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { LaneRate, ILaneRate, IManualAccessorial } from '../models/LaneRate';
import { User } from '../models/User'; // For createdBy in manual entries
import { Shipment } from '../models/Shipment'; // For populating shipment accessorials
import { logger } from '../utils/logger';

const parseSortQuery = (sortQueryString?: string, defaultSort: Record<string, 1 | -1> = { rateDate: -1 }): Record<string, 1 | -1> => {
    if (!sortQueryString) return defaultSort;
    const sortOptions: Record<string, 1 | -1> = {};
    sortQueryString.split(',').forEach(part => {
        const trimmedPart = part.trim();
        if (trimmedPart.startsWith('-')) {
            sortOptions[trimmedPart.substring(1)] = -1;
        } else {
            sortOptions[trimmedPart] = 1;
        }
    });
    return Object.keys(sortOptions).length > 0 ? sortOptions : defaultSort;
};

export class LaneRateController {

  async getLaneRateSummary(req: Request, res: Response): Promise<void> {
    logger.info('Fetching lane rate summary. Query:', req.query);
    try {
      const {
        modeOfTransport,
        equipmentType,
        carrierId,
        searchTerm
      } = req.query;

      const matchStage: any = { isActive: true };

      if (modeOfTransport && typeof modeOfTransport === 'string' && modeOfTransport !== '') {
        matchStage.modeOfTransport = modeOfTransport;
      }
      if (equipmentType && typeof equipmentType === 'string' && equipmentType !== '') {
        matchStage.equipmentType = { $regex: equipmentType, $options: 'i' };
      }
      if (carrierId && typeof carrierId === 'string' && mongoose.Types.ObjectId.isValid(carrierId)) {
        matchStage.carrier = new mongoose.Types.ObjectId(carrierId);
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
            matchStage.$and = matchStage.$and || [];
            matchStage.$and.push({ $or: searchOrConditions });
        } else {
            matchStage.$or = searchOrConditions;
        }
      }

      logger.info('Lane Rate Summary Match Stage:', JSON.stringify(matchStage));

      const laneSummary = await LaneRate.aggregate([
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

      logger.info(`Lane rate summary fetched. Count: ${laneSummary.length}`);
      res.status(200).json({ success: true, data: laneSummary });
    } catch (error: any) {
      logger.error('Error fetching lane rate summary:', { message: error.message, stack: error.stack });
      res.status(500).json({ success: false, message: 'Error fetching lane rate summary', errorDetails: error.message });
    }
  }

  async getLaneRateDetail(req: Request, res: Response): Promise<void> {
    const {
      originCity, originState, destinationCity, destinationState,
      originZip, destinationZip,
      carrierId, modeOfTransport, equipmentType,
      page = '1', limit = '25', sort = '-rateDate'
    } = req.query;

    logger.info('Fetching lane rate details. Query:', req.query);

    if (!originCity || !originState || !destinationCity || !destinationState) {
      res.status(400).json({ success: false, message: 'Origin and destination city/state are required for lane detail.' });
      return;
    }

    try {
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const sortOptions = parseSortQuery(sort as string);

      const query: any = {
        originCity: originCity as string,
        originState: originState as string,
        destinationCity: destinationCity as string,
        destinationState: destinationState as string,
        isActive: true,
      };

      if (originZip && typeof originZip === 'string') query.originZip = originZip;
      if (destinationZip && typeof destinationZip === 'string') query.destinationZip = destinationZip;
      if (carrierId && typeof carrierId === 'string' && mongoose.Types.ObjectId.isValid(carrierId)) {
        query.carrier = new mongoose.Types.ObjectId(carrierId);
      }
      if (modeOfTransport && typeof modeOfTransport === 'string') query.modeOfTransport = modeOfTransport;
      if (equipmentType && typeof equipmentType === 'string') query.equipmentType = { $regex: equipmentType, $options: 'i' };

      const laneRates = await LaneRate.find(query)
        .populate('carrier', 'name mcNumber')
        .populate('createdBy', 'firstName lastName email')
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

      const total = await LaneRate.countDocuments(query);

      const processedLaneRates = laneRates.map(lr => {
        let displayAccessorials: { name: string, cost: number, notes?: string }[] = [];
        if (lr.sourceType === 'MANUAL_ENTRY' && lr.manualAccessorials && lr.manualAccessorials.length > 0) {
          displayAccessorials = lr.manualAccessorials.map(ma => ({
            name: ma.name,
            cost: ma.cost,
            notes: ma.notes
          }));
        } else if (lr.sourceType === 'TMS_SHIPMENT' && lr.sourceShipmentId && (lr.sourceShipmentId as any).accessorials) {
          const shipmentAccessorials = (lr.sourceShipmentId as any).accessorials;
          displayAccessorials = shipmentAccessorials.map((sa: any) => ({
            name: (sa.accessorialTypeId as any)?.name || sa.name || 'Unknown Accessorial',
            cost: (sa.carrierCost || 0) * (sa.quantity || 1),
            notes: sa.notes
          }));
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
    } catch (error: any) {
      logger.error('Error fetching lane rate details:', { message: error.message, stack: error.stack });
      res.status(500).json({ success: false, message: 'Error fetching lane rate details', errorDetails: error.message });
    }
  }

  async getLaneRatesByCarrier(req: Request, res: Response): Promise<void> {
    const { carrierId } = req.params;
    const { page = '1', limit = '25', sort = '-rateDate' } = req.query;
    logger.info(`Fetching lane rates for carrier ID: ${carrierId}. Query:`, req.query);

    if (!mongoose.Types.ObjectId.isValid(carrierId)) {
      res.status(400).json({ success: false, message: 'Invalid carrier ID format.' });
      return;
    }
    try {
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const sortOptions = parseSortQuery(sort as string);

      const query = { carrier: new mongoose.Types.ObjectId(carrierId), isActive: true };

      const laneRates = await LaneRate.find(query)
        .populate('createdBy', 'firstName lastName')
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

      const total = await LaneRate.countDocuments(query);

      const processedLaneRates = laneRates.map(lr => {
        let displayAccessorials: { name: string, cost: number, notes?: string }[] = [];
        if (lr.sourceType === 'MANUAL_ENTRY' && lr.manualAccessorials && lr.manualAccessorials.length > 0) {
          displayAccessorials = lr.manualAccessorials.map(ma => ({ name: ma.name, cost: ma.cost, notes: ma.notes }));
        } else if (lr.sourceType === 'TMS_SHIPMENT' && lr.sourceShipmentId && (lr.sourceShipmentId as any).accessorials) {
          const shipmentAccessorials = (lr.sourceShipmentId as any).accessorials;
          displayAccessorials = shipmentAccessorials.map((sa: any) => ({
            name: (sa.accessorialTypeId as any)?.name || sa.name || 'Unknown Accessorial',
            cost: (sa.carrierCost || 0) * (sa.quantity || 1),
            notes: sa.notes
          }));
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
    } catch (error: any) {
        logger.error(`Error fetching lane rates for carrier ${carrierId}:`, { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Error fetching carrier lane rates.', errorDetails: error.message });
    }
  }

  async createManualLaneRate(req: Request, res: Response): Promise<void> {
    logger.info('Attempting to create manual lane rate:', req.body);
    try {
      const {
        originCity, originState, destinationCity, destinationState,
        carrier, lineHaulCost, modeOfTransport,
        originZip, destinationZip, lineHaulRate, fscPercentage,
        chassisCostCarrier, chassisCostCustomer,
        manualAccessorials,
        rateDate, rateValidUntil, equipmentType, notes
      } = req.body;

      let createdByUserId = req.body.createdBy;
      if (!createdByUserId && (req as any).user && (req as any).user._id) {
        createdByUserId = (req as any).user._id;
      } else if (!createdByUserId) {
        const defaultUser = await User.findOne({ email: 'admin@example.com' }).select('_id').lean();
        if (defaultUser) {
            createdByUserId = defaultUser._id.toString();
        } else {
            logger.error('CRITICAL: createdBy field missing for manual lane rate and no default user found.');
            return res.status(400).json({ success: false, message: 'User context (createdBy) is missing and no default available.' });
        }
      }

      const missing = [];
      if (!originCity) missing.push('originCity');
      if (!originState) missing.push('originState');
      if (!destinationCity) missing.push('destinationCity');
      if (!destinationState) missing.push('destinationState');
      if (!carrier) missing.push('carrier (ID)');
      if (lineHaulCost === undefined || lineHaulCost === null) missing.push('lineHaulCost');
      if (!modeOfTransport) missing.push('modeOfTransport');
      if (!createdByUserId) missing.push('createdBy (user ID)');


      if (missing.length > 0) {
        logger.warn(`Validation failed for manual lane rate creation. Missing: ${missing.join(', ')}`, { body: req.body });
        return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}.` });
      }

      if (!mongoose.Types.ObjectId.isValid(carrier)) {
         return res.status(400).json({ success: false, message: 'Invalid Carrier ID format.' });
      }
      if (!mongoose.Types.ObjectId.isValid(createdByUserId)) {
         return res.status(400).json({ success: false, message: 'Invalid Created By User ID format.' });
      }

      const laneRateEntryData: Partial<ILaneRate> = {
        originCity, originState, destinationCity, destinationState,
        carrier: new mongoose.Types.ObjectId(carrier),
        lineHaulCost: parseFloat(lineHaulCost),
        modeOfTransport,
        createdBy: new mongoose.Types.ObjectId(createdByUserId),
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
            name: acc.name.trim(),
            cost: parseFloat(String(acc.cost)), // Ensure cost is parsed as number
            notes: acc.notes || undefined,
          })) as IManualAccessorial[];
      }

      const newLaneRate = new LaneRate(laneRateEntryData);
      await newLaneRate.save();

      logger.info('Manual lane rate created successfully:', newLaneRate._id);
      const populatedLaneRate = await LaneRate.findById(newLaneRate._id)
            .populate('carrier', 'name mcNumber')
            .populate('createdBy', 'firstName lastName email')
            .lean();

      res.status(201).json({ success: true, data: populatedLaneRate, message: 'Manual lane rate created.' });

    } catch (error: any) {
      logger.error('Error creating manual lane rate:', { message: error.message, body: req.body, stack: error.stack });
      if (error.name === 'ValidationError') {
        res.status(400).json({ success: false, message: error.message, errors: error.errors });
      } else {
        res.status(500).json({ success: false, message: 'Error creating manual lane rate.' });
      }
    }
  }

  async updateManualLaneRate(req: Request, res: Response): Promise<void> {
    const { laneRateId } = req.params;
    logger.info(`Attempting to update lane rate ID: ${laneRateId}`, { body: req.body });

    if (!mongoose.Types.ObjectId.isValid(laneRateId)) {
      return res.status(400).json({ success: false, message: 'Invalid LaneRate ID format.' });
    }

    try {
      const existingLaneRate = await LaneRate.findById(laneRateId);
      if (!existingLaneRate) {
        return res.status(404).json({ success: false, message: 'Lane rate entry not found.' });
      }
      // Removed the check for sourceType === 'MANUAL_ENTRY' to allow editing of all lane rates

      const {
        originCity, originState, destinationCity, destinationState,
        carrier, lineHaulCost, modeOfTransport,
        originZip, destinationZip, lineHaulRate, fscPercentage,
        chassisCostCarrier, chassisCostCustomer,
        manualAccessorials,
        rateDate, rateValidUntil, equipmentType, notes, isActive
      } = req.body;

      if (originCity === '' || originState === '' || destinationCity === '' || destinationState === '' || carrier === '' || lineHaulCost === '' || modeOfTransport === '') {
          logger.warn(`Validation failed for lane rate update. Core fields cannot be empty. ID: ${laneRateId}`);
          return res.status(400).json({ success: false, message: 'Core fields (Origin/Dest City & State, Carrier, Line Haul Cost, Mode) cannot be empty.' });
      }
      if (carrier && !mongoose.Types.ObjectId.isValid(carrier)) {
         return res.status(400).json({ success: false, message: 'Invalid Carrier ID format for update.' });
      }

      existingLaneRate.originCity = originCity;
      existingLaneRate.originState = originState;
      existingLaneRate.destinationCity = destinationCity;
      existingLaneRate.destinationState = destinationState;
      if (carrier) existingLaneRate.carrier = new mongoose.Types.ObjectId(carrier); // Update carrier if provided
      existingLaneRate.lineHaulCost = parseFloat(lineHaulCost);
      existingLaneRate.modeOfTransport = modeOfTransport;

      existingLaneRate.originZip = originZip || undefined;
      existingLaneRate.destinationZip = destinationZip || undefined;
      existingLaneRate.lineHaulRate = (lineHaulRate !== undefined && lineHaulRate !== null && lineHaulRate !== '') ? parseFloat(lineHaulRate) : undefined;
      existingLaneRate.fscPercentage = (fscPercentage !== undefined && fscPercentage !== null && fscPercentage !== '') ? parseFloat(fscPercentage) : undefined;
      existingLaneRate.chassisCostCarrier = (chassisCostCarrier !== undefined && chassisCostCarrier !== null && chassisCostCarrier !== '') ? parseFloat(chassisCostCarrier) : undefined;
      existingLaneRate.chassisCostCustomer = (chassisCostCustomer !== undefined && chassisCostCustomer !== null && chassisCostCustomer !== '') ? parseFloat(chassisCostCustomer) : undefined;

      existingLaneRate.rateDate = rateDate ? new Date(rateDate) : existingLaneRate.rateDate;
      existingLaneRate.rateValidUntil = rateValidUntil ? new Date(rateValidUntil) : undefined;
      existingLaneRate.equipmentType = equipmentType || undefined;
      existingLaneRate.notes = notes || undefined;
      if (isActive !== undefined) existingLaneRate.isActive = isActive;


      if (Array.isArray(manualAccessorials)) {
        existingLaneRate.manualAccessorials = manualAccessorials
          .filter(acc => typeof acc.name === 'string' && acc.name.trim() !== '' && acc.cost !== undefined && acc.cost !== null)
          .map(acc => ({
            name: acc.name.trim(),
            cost: parseFloat(String(acc.cost)),
            notes: acc.notes || undefined,
          })) as IManualAccessorial[];
      } else {
        existingLaneRate.manualAccessorials = [];
      }

      if ((req as any).user && (req as any).user._id && mongoose.Types.ObjectId.isValid((req as any).user._id)) {
          existingLaneRate.updatedBy = new mongoose.Types.ObjectId((req as any).user._id);
      }
      // When a TMS-derived rate is edited, its sourceType remains 'TMS_SHIPMENT'
      // to indicate its origin, but its data is now manually overridden.
      // You could add another flag like 'isManuallyOverridden: true' if needed.

      await existingLaneRate.save();
      logger.info('Lane rate updated successfully:', existingLaneRate._id);

      const populatedLaneRate = await LaneRate.findById(existingLaneRate._id)
            .populate('carrier', 'name mcNumber')
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email')
            .lean();

      res.status(200).json({ success: true, data: populatedLaneRate, message: 'Lane rate updated.' });

    } catch (error: any) {
      logger.error('Error updating lane rate:', { message: error.message, id: laneRateId, body: req.body, stack: error.stack });
      if (error.name === 'ValidationError') {
        res.status(400).json({ success: false, message: error.message, errors: error.errors });
      } else {
        res.status(500).json({ success: false, message: 'Error updating lane rate.' });
      }
    }
  }

  async deleteLaneRate(req: Request, res: Response): Promise<void> {
    const { laneRateId } = req.params;
    logger.info(`Attempting to delete lane rate with ID: ${laneRateId}`);

    if (!mongoose.Types.ObjectId.isValid(laneRateId)) {
      res.status(400).json({ success: false, message: 'Invalid LaneRate ID format.' });
      return;
    }
    try {
      const result = await LaneRate.findByIdAndDelete(laneRateId);
      if (!result) {
        res.status(404).json({ success: false, message: 'Lane rate entry not found.' });
        return;
      }
      logger.info(`Lane rate entry with ID: ${laneRateId} deleted successfully.`);
      res.status(200).json({ success: true, message: 'Lane rate entry deleted successfully.' });
    } catch (error: any) {
      logger.error('Error deleting lane rate entry:', { message: error.message, stack: error.stack, id: laneRateId });
      res.status(500).json({ success: false, message: 'Error deleting lane rate entry.', errorDetails: error.message });
    }
  }
}