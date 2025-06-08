// File: backend/src/services/laneRateService.ts
import { IShipment } from '../models/Shipment';
import { LaneRate, ILaneRate } from '../models/LaneRate';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

// This helper function is no longer needed as we'll handle parsing inline.

export class LaneRateService {
  public async recordLaneRateFromShipment(shipment: IShipment): Promise<ILaneRate | null> {
    logger.info(`[LaneRateService] Processing shipment ${shipment.shipmentNumber}. Status: ${shipment.status}`);

    // Condition 1: Check status
    if (!['quote', 'booked', 'delivered', 'invoiced', 'paid'].includes(shipment.status)) {
      logger.info(`[LaneRateService] Exiting: Status "${shipment.status}" is not eligible.`);
      return null;
    }

    // Condition 2: Check for required location data
    if (!shipment.origin?.city || !shipment.origin?.state || !shipment.destination?.city || !shipment.destination?.state) {
      logger.warn(`[LaneRateService] Exiting: Shipment ${shipment.shipmentNumber} is missing location data.`);
      return null;
    }

    try {
      // --- Start building the payload safely ---
      const payload: Partial<ILaneRate> = {
        originCity: shipment.origin.city,
        originState: shipment.origin.state,
        destinationCity: shipment.destination.city,
        destinationState: shipment.destination.state,
        sourceType: 'TMS_SHIPMENT',
        sourceShipmentId: shipment._id,
        sourceQuoteShipmentNumber: shipment.shipmentNumber,
        rateDate: shipment.createdAt || new Date(),
        modeOfTransport: shipment.modeOfTransport,
        createdBy: shipment.createdBy,
        isActive: true,
      };

      // --- Assign values only if they are valid numbers or non-empty strings ---
      // For optional numeric fields, we parse them. If they are invalid, we don't add them to the payload.
      const lineHaulRate = parseFloat(String(shipment.customerRate));
      if (!isNaN(lineHaulRate)) payload.lineHaulRate = lineHaulRate;
      
      const lineHaulCost = parseFloat(String(shipment.carrierCostTotal));
      if (!isNaN(lineHaulCost)) payload.lineHaulCost = lineHaulCost; else {
        logger.warn(`[LaneRateService] Exiting: carrierCostTotal is invalid for ${shipment.shipmentNumber}`);
        return null; // lineHaulCost is required, so we must exit if it's invalid.
      }
      
      const fscCustomerAmount = parseFloat(String(shipment.fscCustomerAmount));
      if (!isNaN(fscCustomerAmount) && shipment.fscType === 'percentage') {
          payload.fscPercentage = fscCustomerAmount;
      } else if (!isNaN(fscCustomerAmount) && shipment.fscType === 'fixed' && payload.lineHaulRate && payload.lineHaulRate > 0) {
          payload.fscPercentage = (fscCustomerAmount / payload.lineHaulRate) * 100;
      }
      
      const fscCarrierAmount = parseFloat(String(shipment.fscCarrierAmount));
      if (!isNaN(fscCarrierAmount) && shipment.fscType === 'percentage') {
          payload.carrierFscPercentage = fscCarrierAmount;
      } else if (!isNaN(fscCarrierAmount) && shipment.fscType === 'fixed' && payload.lineHaulCost > 0) {
          payload.carrierFscPercentage = (fscCarrierAmount / payload.lineHaulCost) * 100;
      }
      
      const chassisCustomerCost = parseFloat(String(shipment.chassisCustomerCost));
      if (!isNaN(chassisCustomerCost)) payload.chassisCostCustomer = chassisCustomerCost;

      const chassisCarrierCost = parseFloat(String(shipment.chassisCarrierCost));
      if (!isNaN(chassisCarrierCost)) payload.chassisCostCarrier = chassisCarrierCost;

      // Assign optional string/ID fields
      if (shipment.origin.zip) payload.originZip = shipment.origin.zip;
      if (shipment.destination.zip) payload.destinationZip = shipment.destination.zip;
      if (shipment.carrier) payload.carrier = shipment.carrier;
      if (shipment.equipmentType) payload.equipmentType = shipment.equipmentType;
      if (shipment.status === 'quote' && shipment.quoteNotes) payload.notes = shipment.quoteNotes;
      if (shipment.status !== 'quote' && shipment.internalNotes) payload.notes = shipment.internalNotes;

      logger.info(`[LaneRateService] Constructed final payload for ${shipment.shipmentNumber}:`, JSON.stringify(payload, null, 2));

      // Find and update or create
      const existingLaneRate = await LaneRate.findOne({ sourceShipmentId: shipment._id });

      if (existingLaneRate) {
        logger.info(`[LaneRateService] Updating existing lane rate (${existingLaneRate._id})...`);
        if (shipment.updatedBy) payload.updatedBy = shipment.updatedBy;
        
        Object.assign(existingLaneRate, payload);
        await existingLaneRate.save();
        
        logger.info(`[LaneRateService] Updated lane rate ID: ${existingLaneRate._id}`);
        return existingLaneRate;
      } else {
        logger.info(`[LaneRateService] Creating new lane rate...`);
        const newLaneRate = new LaneRate(payload);
        await newLaneRate.save();
        
        logger.info(`[LaneRateService] Created new lane rate ID: ${newLaneRate._id}`);
        return newLaneRate;
      }

    } catch (error: any) {
      logger.error(`[LaneRateService] CRITICAL ERROR for shipment ${shipment.shipmentNumber}:`, {
        message: error.message,
        stack: error.stack,
      });
      return null;
    }
  }
}