// File: backend/src/models/ApplicationSettings.ts
import mongoose, { Schema, Document } from 'mongoose';

// Interface for specific Quote Form settings
export interface IQuoteFormSettings {
  requiredFields: string[]; // Array of field IDs that are required
  quoteNumberPrefix: string;
  quoteNumberNextSequence: number;
  // Add other quote-specific settings here
}

// General Application Settings Interface
export interface IApplicationSettings extends Document {
  key: string; // e.g., 'quoteForm', 'globalDefaults', 'userPermissionsConfig'
  settings: IQuoteFormSettings | Record<string, any>; // Flexible settings object
  lastUpdatedBy?: mongoose.Types.ObjectId;
  // createdAt and updatedAt will be added by timestamps
}

const applicationSettingsSchema = new Schema<IApplicationSettings>({
  key: {
    type: String,
    required: true,
    unique: true, // Ensure only one document per key
    index: true,
  },
  settings: {
    type: Schema.Types.Mixed, // Allows for flexible settings structure
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