import mongoose, { Schema, Document as MongooseDocument } from 'mongoose'; // <--- ALIASED HERE

export interface IDocument extends MongooseDocument { // <--- USE THE ALIAS
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
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
  path: { type: String, required: true },
  tags: [String],
  relatedTo: {
    type: { type: String, enum: ['shipment', 'carrier', 'shipper', 'general'], required: true },
    id: { type: Schema.Types.ObjectId }
  },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

// This is your model, no need to change the name here
export const Document = mongoose.model<IDocument>('Document', documentSchema);