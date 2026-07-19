import { Schema, model, Document, Types } from 'mongoose';

export interface ITransaction extends Document {
  userId: Types.ObjectId;
  title: string;
  amount: number; // Negative for expense, positive for income
  type?: string; // 'Expense' or 'Income'
  category: string;
  date: Date;
  receiptUrl?: string;
  createdAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  amount: { type: Number, required: true },
  // New field indicating transaction type
  type: { type: String, enum: ['Expense', 'Income'] },
  category: { type: String, required: true, index: true },
  date: { type: Date, required: true, index: true },
  receiptUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Compound indexes for optimal sorting and filtering
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1 });

export const Transaction = model<ITransaction>('Transaction', transactionSchema);
