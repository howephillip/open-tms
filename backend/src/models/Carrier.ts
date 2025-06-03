import mongoose, { Schema, Document } from 'mongoose';

export interface ICarrier extends Document {
  name: string;
  mcNumber: string;
  dotNumber: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  contact: {
    name: string;
    phone: string;
    email: string;
  };
  saferData: {
    lastUpdated: Date;
    saferRating: string;
    status: string;
    insuranceInfo: any;
  };
  equipment: string[];
  preferredLanes: string[];
  rates: {
    average: number;
    lastUpdated: Date;
  };
  performance: {
    onTimeDelivery: number;
    totalShipments: number;
    averageRating: number;
  };
  documents: [mongoose.Types.ObjectId];
  createdAt: Date;
  updatedAt: Date;
}

const carrierSchema = new Schema<ICarrier>({
  name: { type: String, required: true },
  mcNumber: { type: String, required: true, unique: true },
  dotNumber: { type: String, required: true, unique: true },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true }
  },
  contact: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true }
  },
  saferData: {
    lastUpdated: Date,
    saferRating: String,
    status: String,
    insuranceInfo: Schema.Types.Mixed
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
  documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }]
}, {
  timestamps: true
});

export const Carrier = mongoose.model<ICarrier>('Carrier', carrierSchema);
