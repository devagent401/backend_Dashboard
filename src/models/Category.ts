import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  parentId?: mongoose.Types.ObjectId;
  ancestors: mongoose.Types.ObjectId[];
  level: number;
  image?: string;
  icon?: string;
  status: 'active' | 'inactive';
  order: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  productCount: number;
}

const categorySchema = new Schema<ICategory>(
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
    description: String,
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    ancestors: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    level: {
      type: Number,
      default: 0,
      index: true,
    },
    image: String,
    icon: String,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    order: {
      type: Number,
      default: 0,
    },
    seoTitle: String,
    seoDescription: String,
    seoKeywords: [String],
    productCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for hierarchical queries
categorySchema.index({ ancestors: 1, level: 1 });
categorySchema.index({ parentId: 1, order: 1 });

// Text search index
categorySchema.index({ name: 'text', description: 'text' });

// Pre-save hook to set ancestors and level
categorySchema.pre('save', async function (next) {
  if (this.isModified('parentId')) {
    if (this.parentId) {
      const parent = await mongoose.model('Category').findById(this.parentId);
      if (parent) {
        this.ancestors = [...(parent.ancestors || []), parent._id];
        this.level = parent.level + 1;
      }
    } else {
      this.ancestors = [];
      this.level = 0;
    }
  }
  next();
});

export default mongoose.model<ICategory>('Category', categorySchema);

