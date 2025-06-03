// File: backend/src/models/LaneRate.ts
import mongoose, { Schema, Document } from 'mongoose';

// Define a sub-schema for manually entered accessorials
export interface IManualAccessorial extends Document {
  name: string; // e.g., "Detention", "Lumper Fee"
  cost: number; // Carrier's cost for this accessorial
  notes?: string;
}

const manualAccessorialSchema = new Schema<IManualAccessorial>({
  name: { type: String, required: true, trim: true },
  cost: { type: Number, required: true, default: 0 },
  notes: { type: String, trim: true },
}, { _id: true }); // Give each manual accessorial its own ID if needed for UI editing

export interface ILaneRate extends Document {
  originCity: string;
  originState: string;
  originZip?: string;
  destinationCity: string;
  destinationState: string;
  destinationZip?: string;
  carrier: mongoose.Types.ObjectId;
  lineHaulRate: number; // Customer-facing rate
  lineHaulCost?: number; // Carrier cost for this lane
  fscPercentage?: number; // Store as a whole number, e.g., 15 for 15%
  carrierFscPercentage?: number;
  chassisCostCustomer?: number;
  chassisCostCarrier?: number;
  totalAccessorialsCustomer?: number;
  totalAccessorialsCarrier?: number;
  manualAccessorials?: IManualAccessorial[]; // For manually entered rates
  sourceType: 'TMS_SHIPMENT' | 'MANUAL_ENTRY' | 'RATE_IMPORT'; // To distinguish origin
  sourceShipmentId: mongoose.Types.ObjectId; // The quote/shipment that generated this rate
  sourceQuoteShipmentNumber: string; // Denormalized for quick display
  rateDate: Date;
  rateValidUntil?: Date; // Add a validity date for manual rates
  modeOfTransport: string;
  equipmentType?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
}

const laneRateSchema = new Schema<ILaneRate>({
  originCity: { type: String, required: true, trim: true, index: true },
  originState: { type: String, required: true, trim: true, index: true },
  originZip: { type: String, trim: true, sparse: true }, // Sparse index if not always present
  destinationCity: { type: String, required: true, trim: true, index: true },
  destinationState: { type: String, required: true, trim: true, index: true },
  destinationZip: { type: String, trim: true, sparse: true },
  carrier: { type: Schema.Types.ObjectId, ref: 'Carrier', required: true, index: true },
  
  lineHaulRate: { type: Number }, // Customer rate, optional for manual carrier cost entries
  lineHaulCost: { type: Number, required: true }, // Carrier cost, now required for manual entries

  fscPercentage: { type: Number },
  // carrierFscPercentage: { type: Number }, 

  chassisCostCustomer: { type: Number },
  chassisCostCarrier: { type: Number },
  
  totalAccessorialsCustomer: { type: Number, default: 0 },
  totalAccessorialsCarrier: { type: Number, default: 0 },

  manualAccessorials: [manualAccessorialSchema], // Array of manual accessorials

  sourceType: { type: String, enum: ['TMS_SHIPMENT', 'MANUAL_ENTRY', 'RATE_IMPORT'], required: true, default: 'MANUAL_ENTRY' },
  sourceShipmentId: { type: Schema.Types.ObjectId, ref: 'Shipment', sparse: true, index: true }, // No longer required
  sourceQuoteShipmentNumber: { type: String, trim: true, sparse: true }, // No longer required

  rateDate: { type: Date, default: Date.now, index: true },
  rateValidUntil: { type: Date },

  modeOfTransport: { type: String, required: true, trim: true, index: true },
  equipmentType: { type: String, trim: true, index: true },
  notes: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true, index: true },
}, {
  timestamps: true,
});

// Compound index for unique lanes per carrier for a given source (optional, depends on update strategy)
// laneRateSchema.index({ originCity: 1, originState: 1, destinationCity: 1, destinationState: 1, carrier: 1, sourceShipmentId: 1 }, { unique: true });
laneRateSchema.index({ originCity: 1, originState: 1, destinationCity: 1, destinationState: 1, carrier: 1, modeOfTransport: 1, equipmentType: 1, rateDate: -1 });
laneRateSchema.index({ carrier: 1, rateDate: -1 });
laneRateSchema.index({ sourceShipmentId: 1 }); // Keep if you still query by this often

export const LaneRate = mongoose.model<ILaneRate>('LaneRate', laneRateSchema);