import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password?: string; // Optional because it will be removed on toJSON
  role: 'admin' | 'dispatcher' | 'sales' | 'viewer';
  isActive: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false }, // select: false to not return by default
  role: {
    type: String,
    enum: ['admin', 'dispatcher', 'sales', 'viewer'],
    default: 'viewer',
  },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
  toJSON: {
    // Remove password when converting to JSON
    transform(doc, ret) {
      delete ret.password;
      return ret;
    },
  },
});

// Pre-save hook to hash password
userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false; // Should not happen if password is required
  // We need to re-fetch the user with the password field selected
  const userWithPassword = await mongoose.model('User').findById(this._id).select('+password').exec();
  if (!userWithPassword || !userWithPassword.password) return false;
  return bcrypt.compare(candidatePassword, userWithPassword.password);
};

export const User = mongoose.model<IUser>('User', userSchema);