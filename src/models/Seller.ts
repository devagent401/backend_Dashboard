import mongoose, { Document, Schema } from 'mongoose';

export interface ISeller extends Document {
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  logo?: string;
  rating?: number;
  status: 'active' | 'inactive';
}

const sellerSchema = new Schema<ISeller>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      unique: true,
    },
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    logo: String,
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Text search index
sellerSchema.index({ name: 'text', email: 'text' });

export default mongoose.model<ISeller>('Seller', sellerSchema);


