import mongoose, { Document } from 'mongoose';
export interface ICarrierSaferData {
    lastUpdated?: Date;
    saferRating?: string;
    status?: string;
    insuranceInfo?: any;
    totalDrivers?: number;
    totalPowerUnits?: number;
    carrierOperation?: string;
    hmFlag?: string;
    pcFlag?: string;
    censusType?: string;
    outOfServiceDate?: string;
    mcs150Date?: string;
}
export interface ICarrier extends Document {
    name: string;
    mcNumber: string;
    dotNumber: string;
    address: {
        street: string;
        city: string;
        state: string;
        zip: string;
        country?: string;
    };
    contact: {
        name: string;
        phone: string;
        email: string;
        fax?: string;
    };
    saferData?: ICarrierSaferData;
    equipment: string[];
    preferredLanes?: string[];
    rates?: {
        average?: number;
        lastUpdated?: Date;
    };
    performance?: {
        onTimeDelivery?: number;
        totalShipments?: number;
        averageRating?: number;
    };
    documents?: mongoose.Types.ObjectId[];
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const Carrier: mongoose.Model<ICarrier, {}, {}, {}, mongoose.Document<unknown, {}, ICarrier> & ICarrier & {
    _id: mongoose.Types.ObjectId;
}, any>;
//# sourceMappingURL=Carrier.d.ts.map