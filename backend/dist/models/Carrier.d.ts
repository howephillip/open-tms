import mongoose, { Document } from 'mongoose';
export interface ICarrier extends Document {
    name: string;
    mcNumber: string;
    dotNumber: string;
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
    saferData: {
        lastUpdated: Date;
        saferRating: string;
        status: string;
        insuranceInfo: any;
    };
    equipment: string[];
    preferredLanes: string[];
    rates: {
        average: number;
        lastUpdated: Date;
    };
    performance: {
        onTimeDelivery: number;
        totalShipments: number;
        averageRating: number;
    };
    documents: [mongoose.Types.ObjectId];
    createdAt: Date;
    updatedAt: Date;
}
export declare const Carrier: mongoose.Model<ICarrier, {}, {}, {}, mongoose.Document<unknown, {}, ICarrier> & ICarrier & {
    _id: mongoose.Types.ObjectId;
}, any>;
//# sourceMappingURL=Carrier.d.ts.map