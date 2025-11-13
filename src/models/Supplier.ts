import mongoose, { Document, Schema } from 'mongoose';

export interface IPurchaseHistory {
  date: Date;
  productId: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  invoiceNumber?: string;
}

export interface ISupplier extends Document {
  name: string;
  email?: string;
  phone: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  company?: string;
  taxId?: string;
  website?: string;
  contactPerson?: string;
  notes?: string;
  status: 'active' | 'inactive';
  purchaseHistory: IPurchaseHistory[];
  totalPurchaseAmount: number;
  lastPurchaseDate?: Date;
}

const purchaseHistorySchema = new Schema<IPurchaseHistory>(
  {
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    invoiceNumber: String,
  },
  { _id: false }
);

const supplierSchema = new Schema<ISupplier>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    company: String,
    taxId: String,
    website: String,
    contactPerson: String,
    notes: String,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    purchaseHistory: [purchaseHistorySchema],
    totalPurchaseAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPurchaseDate: Date,
  },
  {
    timestamps: true,
  }
);

// Text search index
supplierSchema.index({ name: 'text', company: 'text', email: 'text' });

export default mongoose.model<ISupplier>('Supplier', supplierSchema);

