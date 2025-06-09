// File: backend/src/services/laneRateService.ts
import { IShipment } from '../models/Shipment';
import { LaneRate, ILaneRate } from '../models/LaneRate';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';


export class LaneRateService {
  public async recordLaneRateFromShipment(shipment: IShipment): Promise<ILaneRate | null> {
    
    console.log("\n--- LANE RATE SERVICE DIAGNOSTIC ---");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Inspecting 'shipment' object passed to the service:");
    console.log(JSON.stringify(shipment, null, 2));
    console.log("\nChecking specific fields:");
    console.log(`shipment.origin:`, shipment.origin);
    console.log(`shipment.origin?.city:`, shipment.origin?.city);
    console.log(`shipment.status:`, shipment.status);
    console.log("------------------------------------\n");

    logger.info(`[LaneRateService] Processing shipment ${shipment.shipmentNumber}. Status: ${shipment.status}`);

    if (!['quote', 'booked', 'delivered', 'invoiced', 'paid'].includes(shipment.status)) {
      logger.info(`[LaneRateService] Exiting: Shipment status "${shipment.status}" is not eligible for rate recording.`);
      return null;
    }

    const hasValidLocation = 
        shipment.origin && typeof shipment.origin.city === 'string' && shipment.origin.city.trim().length > 0 &&
        typeof shipment.origin.state === 'string' && shipment.origin.state.trim().length > 0 &&
        shipment.destination && typeof shipment.destination.city === 'string' && shipment.destination.city.trim().length > 0 &&
        typeof shipment.destination.state === 'string' && shipment.destination.state.trim().length > 0;

    if (!hasValidLocation) {
      logger.warn(`[LaneRateService] Exiting: Shipment ${shipment.shipmentNumber} is missing a valid origin/destination city and state.`);
      return null;
    }

    try {
      logger.info(`[LaneRateService] All pre-conditions passed for ${shipment.shipmentNumber}. Proceeding to build lane rate data.`);
      
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

      const parseFloatOrUndefined = (val: any) => {
        const num = parseFloat(String(val));
        return isNaN(num) ? undefined : num;
      }
      
      payload.lineHaulRate = parseFloatOrUndefined(shipment.customerRate);
      payload.lineHaulCost = parseFloatOrUndefined(shipment.carrierCostTotal);
      
      if (payload.lineHaulCost === undefined) {
        logger.warn(`[LaneRateService] Exiting: carrierCostTotal is invalid for ${shipment.shipmentNumber}`);
        return null;
      }

      const fscCustomerAmount = parseFloatOrUndefined(shipment.fscCustomerAmount);
      if (fscCustomerAmount !== undefined) {
        if (shipment.fscType === 'percentage') payload.fscPercentage = fscCustomerAmount;
        else if (shipment.fscType === 'fixed' && payload.lineHaulRate && payload.lineHaulRate > 0) payload.fscPercentage = (fscCustomerAmount / payload.lineHaulRate) * 100;
      }
      
      const fscCarrierAmount = parseFloatOrUndefined(shipment.fscCarrierAmount);
      if (fscCarrierAmount !== undefined) {
        if (shipment.fscType === 'percentage') payload.carrierFscPercentage = fscCarrierAmount;
        else if (shipment.fscType === 'fixed' && payload.lineHaulCost > 0) payload.carrierFscPercentage = (fscCarrierAmount / payload.lineHaulCost) * 100;
      }
      
      payload.chassisCustomerCost = parseFloatOrUndefined(shipment.chassisCustomerCost);
      payload.chassisCarrierCost = parseFloatOrUndefined(shipment.chassisCarrierCost);
      
      if (shipment.origin.zip) payload.originZip = shipment.origin.zip;
      if (shipment.destination.zip) payload.destinationZip = shipment.destination.zip;
      if (shipment.carrier) payload.carrier = shipment.carrier;
      if (shipment.equipmentType) payload.equipmentType = shipment.equipmentType;
      if (shipment.status === 'quote' && shipment.quoteNotes) payload.notes = shipment.quoteNotes;
      if (shipment.status !== 'quote' && shipment.internalNotes) payload.notes = shipment.internalNotes;

      logger.info(`[LaneRateService] Constructed lane rate payload for ${shipment.shipmentNumber}.`);
      
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