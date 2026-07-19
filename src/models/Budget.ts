import { Schema, model, Document, Types } from 'mongoose';

export interface IBudget extends Document {
  userId: Types.ObjectId;
  category: string;
  limit: number;
  createdAt: Date;
}

const budgetSchema = new Schema<IBudget>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true },
  limit: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

budgetSchema.index({ userId: 1, category: 1 }, { unique: true });

export const Budget = model<IBudget>('Budget', budgetSchema);
