import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  avatar?: string;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: function(this: IUser) { return !this.googleId; } },
  googleId: { type: String, sparse: true },
  avatar: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

export const User = model<IUser>('User', userSchema);
