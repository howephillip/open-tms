import mongoose, { Document } from 'mongoose';
export interface IEquipmentType extends Document {
    name: string;
    code?: string;
    description?: string;
    category?: 'trailer' | 'container' | 'chassis' | 'other';
    isActive: boolean;
}
export declare const EquipmentType: mongoose.Model<IEquipmentType, {}, {}, {}, mongoose.Document<unknown, {}, IEquipmentType> & IEquipmentType & {
    _id: mongoose.Types.ObjectId;
}, any>;
//# sourceMappingURL=EquipmentType.d.ts.map