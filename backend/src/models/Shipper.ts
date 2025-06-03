import mongoose, { Schema, Document } from 'mongoose';

export interface IShipper extends Document {
  name: string;
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
  billingInfo: {
    paymentTerms: string;
    creditLimit: number;
    invoiceEmail: string;
  };
  industry: string;
  preferredEquipment: string[];
  totalShipments: number;
  totalRevenue: number;
  averageMargin: number;
  documents: [mongoose.Types.ObjectId];
  createdAt: Date;
  updatedAt: Date;
}

const shipperSchema = new Schema<IShipper>({
  name: { type: String, required: true },
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
  billingInfo: {
    paymentTerms: { type: String, default: 'Net 30' },
    creditLimit: { type: Number, default: 0 },
    invoiceEmail: { type: String, required: true }
  },
  industry: { type: String, required: true },
  preferredEquipment: [String],
  totalShipments: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  averageMargin: { type: Number, default: 0 },
  documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }]
}, {
  timestamps: true
});

export const Shipper = mongoose.model<IShipper>('Shipper', shipperSchema);
