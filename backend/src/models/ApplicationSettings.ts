import mongoose, { Schema, Document } from 'mongoose';

// Interface for specific Quote Form settings
export interface IQuoteFormSettings {
  requiredFields: string[];
  quoteNumberPrefix: string;
  quoteNumberNextSequence: number;
}

// --- NEW: Interface for Shipment Form settings ---
export interface IShipmentFormSettings {
  requiredFields: string[];
}

// General Application Settings Interface
export interface IApplicationSettings extends Document {
  key: string;
  settings: IQuoteFormSettings | IShipmentFormSettings | Record<string, any>; // Updated to include new type
  lastUpdatedBy?: mongoose.Types.ObjectId;
}

const applicationSettingsSchema = new Schema<IApplicationSettings>({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  settings: {
    type: Schema.Types.Mixed,
    required: true,
  },
  lastUpdatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  }
}, {
  timestamps: true,
});

export const ApplicationSettings = mongoose.model<IApplicationSettings>('ApplicationSettings', applicationSettingsSchema);