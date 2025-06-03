// File: backend/src/services/laneRateService.ts
import { IShipment } from '../models/Shipment';
import { LaneRate, ILaneRate } from '../models/LaneRate';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

export class LaneRateService {
  public async recordLaneRateFromShipment(shipment: IShipment): Promise<ILaneRate | null> {
    if (!['quote', 'booked', 'delivered', 'invoiced', 'paid'].includes(shipment.status)) { // Consider which statuses are definitive for a rate
      logger.info(`Skipping lane rate recording for shipment ${shipment.shipmentNumber} with status ${shipment.status}.`);
      return null;
    }

    if (!shipment.carrier) {
      logger.info(`Skipping lane rate recording for quote/shipment ${shipment.shipmentNumber} as no carrier is assigned.`);
      return null;
    }

    if (!shipment.origin?.city || !shipment.origin?.state || !shipment.destination?.city || !shipment.destination?.state) {
      logger.warn(`Skipping lane rate recording for shipment ${shipment.shipmentNumber} due to missing origin/destination city/state.`);
      return null;
    }

    try {
      // --- Calculate Customer Facing FSC Percentage ---
      let customerFscPercentage: number | undefined = undefined;
      if (shipment.fscType === 'percentage' && shipment.fscCustomerAmount != null) {
        customerFscPercentage = shipment.fscCustomerAmount;
      } else if (shipment.fscType === 'fixed' && shipment.fscCustomerAmount != null && shipment.customerRate > 0) {
        customerFscPercentage = (shipment.fscCustomerAmount / shipment.customerRate) * 100;
      }

      // --- Calculate Carrier Cost FSC Percentage ---
      // Assuming fscCarrierAmount on shipment is the actual percentage if type is 'percentage',
      // or the fixed amount if type is 'fixed'.
      let carrierFscPercentage: number | undefined = undefined;
      if (shipment.fscType === 'percentage' && shipment.fscCarrierAmount != null) {
        carrierFscPercentage = shipment.fscCarrierAmount;
      } else if (shipment.fscType === 'fixed' && shipment.fscCarrierAmount != null && shipment.carrierCostTotal > 0) {
        carrierFscPercentage = (shipment.fscCarrierAmount / shipment.carrierCostTotal) * 100;
      }
      // For LaneRate, we might want to store the effective FSC percentage consistently.
      // If your model stores separate customer/carrier FSC amounts and types, use those.
      // For simplicity here, if only one fscType/fscCustomerAmount is on the shipment, we use that for both or derive.
      // The LaneRate model currently has one fscPercentage. Let's assume it's the customer-facing one for now,
      // or you could add a carrierFscPercentage field to LaneRate model.
      // For now, let's use the customerFscPercentage as the primary one for LaneRate.fscPercentage
      // and if you add carrier specific FSC to LaneRate, use carrierFscPercentage.


      let totalAccessorialsCustomerCost = 0;
      let totalAccessorialsCarrierCost = 0;

      if (shipment.accessorials && shipment.accessorials.length > 0) {
        shipment.accessorials.forEach(acc => {
          totalAccessorialsCustomerCost += (acc.customerRate || 0) * (acc.quantity || 1);
          totalAccessorialsCarrierCost += (acc.carrierCost || 0) * (acc.quantity || 1);
        });
      }

      const laneRateData: Partial<ILaneRate> = {
        originCity: shipment.origin.city,
        originState: shipment.origin.state,
        originZip: shipment.origin.zip,
        destinationCity: shipment.destination.city,
        destinationState: shipment.destination.state,
        destinationZip: shipment.destination.zip,
        carrier: shipment.carrier,
        lineHaulRate: shipment.customerRate,      // Customer-facing line haul
        lineHaulCost: shipment.carrierCostTotal,  // This is the base carrier cost (line haul only)
        fscPercentage: customerFscPercentage, // This is the customer-facing one
        carrierFscPercentage: carrierFscPercentage, // Store the carrier specific one
        
        // Using customer-facing FSC for the single fscPercentage field in LaneRate
        // If you want to store carrier specific FSC%, add a field to LaneRate model
        fscPercentage: customerFscPercentage, 
        
        chassisCostCustomer: shipment.chassisCustomerCost,
        chassisCostCarrier: shipment.chassisCarrierCost,     // Carrier's chassis cost
        
        totalAccessorialsCustomer: totalAccessorialsCustomerCost,
        totalAccessorialsCarrier: totalAccessorialsCarrierCost, // Sum of carrier costs for accessorials

        sourceType: 'TMS_SHIPMENT',
        sourceShipmentId: shipment._id,
        sourceQuoteShipmentNumber: shipment.shipmentNumber,
        rateDate: shipment.createdAt, // Using createdAt of the shipment/quote as the rateDate
        modeOfTransport: shipment.modeOfTransport,
        equipmentType: shipment.equipmentType,
        notes: shipment.status === 'quote' ? shipment.quoteNotes : shipment.internalNotes,
        createdBy: shipment.createdBy,
        isActive: true,
      };

      // Upsert logic: Find existing by sourceShipmentId, if exists, update, else create.
      // This ensures that if a quote is updated, its corresponding lane rate entry is updated,
      // rather than creating multiple entries for the same quote.
      const existingLaneRate = await LaneRate.findOne({ sourceShipmentId: shipment._id });

      if (existingLaneRate) {
        Object.assign(existingLaneRate, laneRateData);
        await existingLaneRate.save();
        logger.info(`Updated lane rate from shipment ${shipment.shipmentNumber}. LaneRate ID: ${existingLaneRate._id}`);
        return existingLaneRate;
      } else {
        const newLaneRate = new LaneRate(laneRateData);
        await newLaneRate.save();
        logger.info(`Recorded new lane rate from shipment ${shipment.shipmentNumber}. LaneRate ID: ${newLaneRate._id}`);
        return newLaneRate;
      }

    } catch (error: any) {
      logger.error(`Error recording/updating lane rate for shipment ${shipment.shipmentNumber}:`, {
        message: error.message,
        stack: error.stack,
      });
      return null;
    }
  }
}