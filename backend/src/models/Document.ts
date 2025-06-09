import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IDocument extends MongooseDocument {
  filename: string;      // The unique filename generated for storage (e.g., 12345-invoice.pdf)
  originalName: string;  // The user's original filename (e.g., "invoice.pdf")
  mimetype: string;
  size: number;
  s3Key: string;         // The key for S3 or the full path for local storage
  s3Location: string;    // The full URL (for S3) or an identifier
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
  originalName: { type: String, required: true, index: true }, // Index for searching, but NOT unique
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  s3Key: { type: String, required: true, unique: true, index: true }, // THIS is the unique field
  s3Location: { type: String, required: true },
  tags: [String],
  relatedTo: {
    type: { type: String, enum: ['shipment', 'carrier', 'shipper', 'general'], required: true },
    id: { type: Schema.Types.ObjectId, sparse: true, index: true }
  },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

export const Document = mongoose.model<IDocument>('Document', documentSchema);