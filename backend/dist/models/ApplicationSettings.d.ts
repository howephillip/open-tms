import mongoose, { Document } from 'mongoose';
export interface IQuoteFormSettings {
    requiredFields: string[];
    quoteNumberPrefix: string;
    quoteNumberNextSequence: number;
}
export interface IApplicationSettings extends Document {
    key: string;
    settings: IQuoteFormSettings | Record<string, any>;
    lastUpdatedBy?: mongoose.Types.ObjectId;
}
export declare const ApplicationSettings: mongoose.Model<IApplicationSettings, {}, {}, {}, mongoose.Document<unknown, {}, IApplicationSettings> & IApplicationSettings & {
    _id: mongoose.Types.ObjectId;
}, any>;
//# sourceMappingURL=ApplicationSettings.d.ts.map