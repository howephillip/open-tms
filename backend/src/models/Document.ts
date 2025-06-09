import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IDocument extends MongooseDocument {
  filename: string; // The S3 object key
  originalName: string;
  mimetype: string;
  size: number;
  s3Key: string; // Replaces 'path'
  s3Location: string; // The full S3 URL
  tags: string[];
  relatedTo: {
    type: 'shipment' | 'carrier' | 'shipper' | 'general';
    id?: mongoose.Types.ObjectId;
  };
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  s3Key: { type: String, required: true }, // Changed from path
  s3Location: { type: String, required: true },
  tags: [String],
  relatedTo: {
    type: { type: String, enum: ['shipment', 'carrier', 'shipper', 'general'], required: true },
    id: { type: Schema.Types.ObjectId }
  },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

export const Document = mongoose.model<IDocument>('Document', documentSchema);