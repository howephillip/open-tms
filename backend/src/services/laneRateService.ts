// File: backend/src/services/laneRateService.ts
import { IShipment } from '../models/Shipment';
import { LaneRate, ILaneRate } from '../models/LaneRate';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

export class LaneRateService {
  public async recordLaneRateFromShipment(shipment: IShipment): Promise<ILaneRate | null> {
    if (!['quote', 'booked', 'delivered', 'invoiced', 'paid'].includes(shipment.status)) {
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
      let customerFscPercentage: number | undefined = undefined;
      if (shipment.fscType === 'percentage' && shipment.fscCustomerAmount != null) {
        customerFscPercentage = shipment.fscCustomerAmount;
      } else if (shipment.fscType === 'fixed' && shipment.fscCustomerAmount != null && shipment.customerRate > 0) {
        customerFscPercentage = (shipment.fscCustomerAmount / shipment.customerRate) * 100;
      }

      let carrierFscPercentage: number | undefined = undefined;
      if (shipment.fscType === 'percentage' && shipment.fscCarrierAmount != null) {
        carrierFscPercentage = shipment.fscCarrierAmount;
      } else if (shipment.fscType === 'fixed' && shipment.fscCarrierAmount != null && shipment.carrierCostTotal > 0) {
        carrierFscPercentage = (shipment.fscCarrierAmount / shipment.carrierCostTotal) * 100;
      }

      let totalAccessorialsCustomerCost = 0;
      let totalAccessorialsCarrierCost = 0;

      if (shipment.accessorials && shipment.accessorials.length > 0) {
        shipment.accessorials.forEach((acc) => { // acc is IQuoteAccessorial
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
        lineHaulRate: shipment.customerRate,
        lineHaulCost: shipment.carrierCostTotal,
        fscPercentage: customerFscPercentage !== undefined ? parseFloat(customerFscPercentage.toFixed(2)) : undefined,
        carrierFscPercentage: carrierFscPercentage !== undefined ? parseFloat(carrierFscPercentage.toFixed(2)) : undefined,
        chassisCostCustomer: shipment.chassisCustomerCost,
        chassisCostCarrier: shipment.chassisCostCarrier,
        totalAccessorialsCustomer: totalAccessorialsCustomerCost,
        totalAccessorialsCarrier: totalAccessorialsCarrierCost,
        sourceType: 'TMS_SHIPMENT',
        sourceShipmentId: shipment._id,
        sourceQuoteShipmentNumber: shipment.shipmentNumber,
        rateDate: shipment.createdAt,
        modeOfTransport: shipment.modeOfTransport,
        equipmentType: shipment.equipmentType,
        notes: shipment.status === 'quote' ? shipment.quoteNotes : shipment.internalNotes,
        createdBy: shipment.createdBy,
        isActive: true,
      };

      const existingLaneRate = await LaneRate.findOne({ sourceShipmentId: shipment._id });

      if (existingLaneRate) {
        Object.assign(existingLaneRate, laneRateData);
        if (shipment.updatedBy) {
            existingLaneRate.updatedBy = shipment.updatedBy;
        }
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