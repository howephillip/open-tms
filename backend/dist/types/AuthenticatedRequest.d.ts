import { Request } from 'express';
import mongoose from 'mongoose';
import { IUser } from '../models/User';
export interface AuthenticatedRequest extends Request {
    user?: Partial<IUser> & {
        _id: string | mongoose.Types.ObjectId;
        [key: string]: any;
    };
}
//# sourceMappingURL=AuthenticatedRequest.d.ts.map