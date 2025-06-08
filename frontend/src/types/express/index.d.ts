// backend/src/types/express/index.d.ts
import mongoose from 'mongoose'; // Import mongoose for ObjectId type
import { IUser } from '../../models/User'; // Adjust path as needed

declare global {
  namespace Express {
    interface Request {
      // Make user flexible to accommodate JWT payload or full user doc
      user?: Partial<IUser> & { _id: string | mongoose.Types.ObjectId; [key: string]: any };
    }
  }
}

export {}; // This makes it a module