import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  reference: string;
  type: 'income' | 'expense';
  category: 'sale' | 'purchase' | 'return' | 'damage' | 'salary' | 'rent' | 'utility' | 'other';
  amount: number;
  description?: string;
  date: Date;
  relatedEntity?: {
    entityType: 'order' | 'product' | 'supplier' | 'customer';
    entityId: mongoose.Types.ObjectId;
  };
  createdBy?: mongoose.Types.ObjectId;
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'online';
  status: 'completed' | 'pending' | 'cancelled';
  balance?: number;
}

const transactionSchema = new Schema<ITransaction>(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['sale', 'purchase', 'return', 'damage', 'salary', 'rent', 'utility', 'other'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: String,
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    relatedEntity: {
      entityType: {
        type: String,
        enum: ['order', 'product', 'supplier', 'customer'],
      },
      entityId: Schema.Types.ObjectId,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'online'],
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'cancelled'],
      default: 'completed',
      index: true,
    },
    balance: Number,
  },
  {
    timestamps: true,
  }
);

// Indexes for reporting queries
transactionSchema.index({ type: 1, date: -1 });
transactionSchema.index({ category: 1, date: -1 });
transactionSchema.index({ createdAt: -1 });

export default mongoose.model<ITransaction>('Transaction', transactionSchema);

