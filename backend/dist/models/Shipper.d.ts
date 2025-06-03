import mongoose, { Document } from 'mongoose';
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
export declare const Shipper: mongoose.Model<IShipper, {}, {}, {}, mongoose.Document<unknown, {}, IShipper> & IShipper & {
    _id: mongoose.Types.ObjectId;
}, any>;
//# sourceMappingURL=Shipper.d.ts.map