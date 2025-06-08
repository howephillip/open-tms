import mongoose, { Document } from 'mongoose';
export interface IManualAccessorial extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    cost: number;
    notes?: string;
}
export interface ILaneRate extends Document {
    originCity: string;
    originState: string;
    originZip?: string;
    destinationCity: string;
    destinationState: string;
    destinationZip?: string;
    carrier: mongoose.Types.ObjectId;
    lineHaulRate?: number;
    lineHaulCost: number;
    fscPercentage?: number;
    carrierFscPercentage?: number;
    chassisCostCustomer?: number;
    chassisCostCarrier?: number;
    totalAccessorialsCustomer?: number;
    totalAccessorialsCarrier?: number;
    manualAccessorials?: IManualAccessorial[];
    sourceType: 'TMS_SHIPMENT' | 'MANUAL_ENTRY' | 'RATE_IMPORT';
    sourceShipmentId?: mongoose.Types.ObjectId;
    sourceQuoteShipmentNumber?: string;
    rateDate: Date;
    rateValidUntil?: Date;
    modeOfTransport: string;
    equipmentType?: string;
    notes?: string;
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const LaneRate: mongoose.Model<ILaneRate, {}, {}, {}, mongoose.Document<unknown, {}, ILaneRate> & ILaneRate & {
    _id: mongoose.Types.ObjectId;
}, any>;
//# sourceMappingURL=LaneRate.d.ts.map