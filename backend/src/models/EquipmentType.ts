import mongoose, { Schema, Document } from 'mongoose';

export interface IEquipmentType extends Document {
  name: string; // e.g., "53' Dry Van", "40' HC Container", "20' Reefer"
  code?: string; // Optional short code, e.g., "DV53", "HC40"
  description?: string;
  category?: 'trailer' | 'container' | 'chassis' | 'other'; // For grouping/filtering
  isActive: boolean;
}

const equipmentTypeSchema = new Schema<IEquipmentType>({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, unique: true, sparse: true, trim: true },
  description: { type: String, trim: true },
  category: { type: String, enum: ['trailer', 'container', 'chassis', 'other'], trim: true },
  isActive: { type: Boolean, default: true, index: true },
}, {
  timestamps: true,
});

equipmentTypeSchema.index({ name: 1, category: 1 });

export const EquipmentType = mongoose.model<IEquipmentType>('EquipmentType', equipmentTypeSchema);