import mongoose, { Schema, Document } from 'mongoose';

export interface IManualAccessorial extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  cost: number;
  notes?: string;
}

const manualAccessorialSchema = new Schema<IManualAccessorial>({
  name: { type: String, required: true, trim: true },
  cost: { type: Number, required: true, default: 0 },
  notes: { type: String, trim: true },
}, { _id: true });

export interface ILaneRate extends Document {
  originCity: string;
  originState: string;
  originZip?: string;
  destinationCity: string;
  destinationState: string;
  destinationZip?: string;
  carrier?: mongoose.Types.ObjectId; // Changed to optional
  lineHaulRate?: number;
  lineHaulCost: number;
  fscPercentage?: number;
  carrierFscPercentage?: number;
  chassisCostCustomer?: number;
  chassisCostCarrier?: number;
  totalAccessorialsCustomer?: number;
  totalAccessorialsCarrier?: number;
  manualAccessorials?: IManualAccessorial[];
  sourceType: 'TMS_SHIPMENT' | 'MANUAL_ENTRY' | 'RATE_IMPORT';
  sourceShipmentId?: mongoose.Types.ObjectId;
  sourceQuoteShipmentNumber?: string;
  rateDate: Date;
  rateValidUntil?: Date;
  modeOfTransport: string;
  equipmentType?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const laneRateSchema = new Schema<ILaneRate>({
  originCity: { type: String, required: true, trim: true, index: true },
  originState: { type: String, required: true, trim: true, index: true },
  originZip: { type: String, trim: true, sparse: true },
  destinationCity: { type: String, required: true, trim: true, index: true },
  destinationState: { type: String, required: true, trim: true, index: true },
  destinationZip: { type: String, trim: true, sparse: true },
  // --- THE FIX: `required` is now false ---
  carrier: { type: Schema.Types.ObjectId, ref: 'Carrier', required: false, index: true },
  lineHaulRate: { type: Number },
  lineHaulCost: { type: Number, required: true },
  fscPercentage: { type: Number },
  carrierFscPercentage: { type: Number },
  chassisCostCustomer: { type: Number },
  chassisCostCarrier: { type: Number },
  totalAccessorialsCustomer: { type: Number, default: 0 },
  totalAccessorialsCarrier: { type: Number, default: 0 },
  manualAccessorials: [manualAccessorialSchema],
  sourceType: { type: String, enum: ['TMS_SHIPMENT', 'MANUAL_ENTRY', 'RATE_IMPORT'], required: true, default: 'MANUAL_ENTRY' },
  sourceShipmentId: { type: Schema.Types.ObjectId, ref: 'Shipment', sparse: true, index: true },
  sourceQuoteShipmentNumber: { type: String, trim: true, sparse: true },
  rateDate: { type: Date, default: Date.now, index: true },
  rateValidUntil: { type: Date },
  modeOfTransport: { type: String, required: true, trim: true, index: true },
  equipmentType: { type: String, trim: true, index: true },
  notes: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true, index: true },
}, {
  timestamps: true,
});

laneRateSchema.index({ originCity: 1, originState: 1, destinationCity: 1, destinationState: 1, carrier: 1, modeOfTransport: 1, equipmentType: 1, rateDate: -1 });
laneRateSchema.index({ carrier: 1, rateDate: -1 });
laneRateSchema.index({ sourceShipmentId: 1 });

export const LaneRate = mongoose.model<ILaneRate>('LaneRate', laneRateSchema);