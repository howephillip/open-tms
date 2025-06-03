import mongoose, { Document as MongooseDocument } from 'mongoose';
export interface IDocument extends MongooseDocument {
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
export declare const Document: mongoose.Model<IDocument, {}, {}, {}, mongoose.Document<unknown, {}, IDocument> & IDocument & {
    _id: mongoose.Types.ObjectId;
}, any>;
//# sourceMappingURL=Document.d.ts.map