// File: backend/src/models/Carrier.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ICarrierSaferData {
  lastUpdated?: Date;
  saferRating?: string;
  status?: string;
  insuranceInfo?: any;
  totalDrivers?: number;
  totalPowerUnits?: number;
  carrierOperation?: string;
  hmFlag?: string;
  pcFlag?: string;
  censusType?: string;
  outOfServiceDate?: string;
  mcs150Date?: string;
}

export interface ICarrier extends Document {
  name: string;
  mcNumber: string;
  dotNumber: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
  };
  contact: {
    name: string;
    phone: string;
    email: string;
    fax?: string;
  };
  saferData?: ICarrierSaferData;
  equipment: string[];
  preferredLanes?: string[];
  rates?: {
    average?: number;
    lastUpdated?: Date;
  };
  performance?: {
    onTimeDelivery?: number;
    totalShipments?: number;
    averageRating?: number;
  };
  documents?: mongoose.Types.ObjectId[];
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const carrierSchema = new Schema<ICarrier>({
  name: { type: String, required: true, trim: true },
  mcNumber: { type: String, required: true, unique: true, trim: true, index: true },
  dotNumber: { type: String, required: true, unique: true, trim: true, index: true },
  address: {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    zip: { type: String, required: true, trim: true },
    country: { type: String, trim: true, default: 'USA' }
  },
  contact: {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    fax: { type: String, trim: true }
  },
  saferData: {
    lastUpdated: Date,
    saferRating: String,
    status: String,
    insuranceInfo: Schema.Types.Mixed,
    totalDrivers: Number,
    totalPowerUnits: Number,
    carrierOperation: String,
    hmFlag: String,
    pcFlag: String,
    censusType: String,
    outOfServiceDate: String,
    mcs150Date: String,
  },
  equipment: [String],
  preferredLanes: [String],
  rates: {
    average: { type: Number, default: 0 },
    lastUpdated: Date
  },
  performance: {
    onTimeDelivery: { type: Number, default: 0 },
    totalShipments: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 }
  },
  documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
  isActive: { type: Boolean, default: true, index: true }
}, {
  timestamps: true
});

export const Carrier = mongoose.model<ICarrier>('Carrier', carrierSchema);