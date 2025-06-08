// File: backend/src/types/express/index.d.ts
import mongoose from 'mongoose'; // For ObjectId type
import { IUser } from '../../models/User'; // Adjust path to your User model interface

// To augment the existing Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: Partial<IUser> & { _id: string | mongoose.Types.ObjectId; [key: string]: any };
      // If your auth middleware adds other properties directly to req, add them here too.
      // For example, if it adds req.auth = { userId: '...' }
      // auth?: { userId: string | mongoose.Types.ObjectId; [key: string]: any };
    }
  }
}

// If you don't have other exports in this file, this isn't strictly necessary,
// but it ensures it's treated as a module if you add other non-global types later.
export {};