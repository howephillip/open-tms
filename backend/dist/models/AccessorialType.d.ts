import mongoose, { Document } from 'mongoose';
export interface IAccessorialType extends Document {
    name: string;
    code?: string;
    description?: string;
    defaultCustomerRate?: number;
    defaultCarrierCost?: number;
    appliesToModes: ('truckload-ftl' | 'truckload-ltl' | 'drayage-import' | 'drayage-export' | 'intermodal-rail' | 'ocean-fcl' | 'ocean-lcl' | 'air-freight' | 'other')[];
    category?: string;
    isPerUnit?: boolean;
    unitName?: string;
    isActive: boolean;
}
export declare const AccessorialType: mongoose.Model<IAccessorialType, {}, {}, {}, mongoose.Document<unknown, {}, IAccessorialType> & IAccessorialType & {
    _id: mongoose.Types.ObjectId;
}, any>;
//# sourceMappingURL=AccessorialType.d.ts.map