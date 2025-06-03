// File: backend/src/models/AccessorialType.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IAccessorialType extends Document {
  name: string; // e.g., "Detention", "Lumper", "Chassis Split"
  code?: string; // Short code, e.g., "DET", "LUMP", "CHASSPL"
  description?: string;
  defaultCustomerRate?: number;
  defaultCarrierCost?: number;
  appliesToModes: ('truckload-ftl' | 'truckload-ltl' | 'drayage-import' | 'drayage-export' | 'intermodal-rail' | 'ocean-fcl' | 'ocean-lcl' | 'air-freight' | 'other')[]; // Which modes this typically applies to
  category?: string; // e.g., "Wait Time", "Handling", "Equipment"
  isPerUnit?: boolean; // e.g., per hour, per day, per item
  unitName?: string; // e.g., "hour", "day", "pallet"
  isActive: boolean;
}

const accessorialTypeSchema = new Schema<IAccessorialType>({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, unique: true, sparse: true, trim: true },
  description: { type: String, trim: true },
  defaultCustomerRate: { type: Number, default: 0 },
  defaultCarrierCost: { type: Number, default: 0 },
  appliesToModes: [{ type: String, required: true }],
  category: { type: String, trim: true },
  isPerUnit: { type: Boolean, default: false },
  unitName: { type: String, trim: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

accessorialTypeSchema.index({ name: 1, category: 1 });

export const AccessorialType = mongoose.model<IAccessorialType>('AccessorialType', accessorialTypeSchema);