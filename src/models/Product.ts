import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  // Required fields
  name: string;
  slug: string;
  description?: string;
  sku: string;

  // Category with snapshot
  category?: mongoose.Types.ObjectId;
  category_snapshot?: {
    id: mongoose.Types.ObjectId;
    name: string;
    slug: string;
  };

  // Brand with snapshot
  brand?: mongoose.Types.ObjectId;
  brand_snapshot?: {
    id: mongoose.Types.ObjectId;
    name: string;
  };

  // Seller
  seller?: mongoose.Types.ObjectId | null;
  is_in_house: boolean;

  // Pricing
  unit: string;
  weight?: number;
  unit_price: number;
  quantity: number;
  is_quantity_multiplying: boolean;

  // Stock
  low_stock_quantity: number;
  show_stock_quantity: boolean;
  show_stock_text_only: boolean;
  hide_stock: boolean;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';

  // Discount
  discount: {
    type: 'flat' | 'percent' | 'none';
    value?: number;
    start_at?: Date;
    end_at?: Date;
  };

  // VAT/Tax
  vat_tax: {
    type: 'flat' | 'percent' | 'none';
    value?: number;
  };

  // Shipping
  free_shipping: boolean;
  free_shipping_flat_rate?: number;
  shipping_cost?: number;
  estimate_shipping_time?: string;

  // Media
  gallery_images: Array<{
    url: string;
    alt?: string;
    order: number;
  }>;
  thumbnail_image?: {
    url: string;
    alt?: string;
  };
  product_video_provider?: string;
  product_video_url?: string;

  // Attributes
  colors: Array<{
    name: string;
    hex: string;
    sku?: string;
  }>;
  attributes: Array<{
    name: string;
    value: string;
  }>;
  tags: string[];

  // SEO
  meta_title?: string;
  meta_description?: string;
  meta_image?: {
    url: string;
    alt?: string;
  };

  // External
  external_link?: string;
  external_link_button_text?: string;

  // Search
  barcode?: string;
  search_keywords: string[];

  // Flags
  publish: boolean;
  cash_on_delivery: boolean;
  is_featured: boolean;
  is_todays_deal: boolean;

  // Flash deals
  flash_deal_title?: string;
  flash_deal_discount?: number;
  flash_deal_discount_type?: 'flat' | 'percent';
}

const productSchema = new Schema<IProduct>(
  {
    // Required fields
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
    sku: {
      type: String,
      required: true,
      sparse: true,
      index: true,
    },

    // Category with snapshot
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      index: true,
    },
    category_snapshot: {
      id: Schema.Types.ObjectId,
      name: String,
      slug: String,
    },

    // Brand with snapshot
    brand: {
      type: Schema.Types.ObjectId,
      ref: 'Brand',
      index: true,
    },
    brand_snapshot: {
      id: Schema.Types.ObjectId,
      name: String,
    },

    // Seller
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'Seller',
      default: null,
      index: true,
    },
    is_in_house: {
      type: Boolean,
      default: true,
    },

    // Pricing
    unit: {
      type: String,
      required: true,
      default: 'piece',
    },
    weight: Number,
    unit_price: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    is_quantity_multiplying: {
      type: Boolean,
      default: false,
    },

    // Stock
    low_stock_quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    show_stock_quantity: {
      type: Boolean,
      default: true,
    },
    show_stock_text_only: {
      type: Boolean,
      default: false,
    },
    hide_stock: {
      type: Boolean,
      default: false,
    },
    stock_status: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock'],
      default: 'in_stock',
      index: true,
    },

    // Discount
    discount: {
      type: {
        type: String,
        enum: ['flat', 'percent', 'none'],
        default: 'none',
      },
      value: Number,
      start_at: Date,
      end_at: Date,
    },

    // VAT/Tax
    vat_tax: {
      type: {
        type: String,
        enum: ['flat', 'percent', 'none'],
        default: 'none',
      },
      value: Number,
    },

    // Shipping
    free_shipping: {
      type: Boolean,
      default: false,
    },
    free_shipping_flat_rate: Number,
    shipping_cost: Number,
    estimate_shipping_time: String,

    // Media
    gallery_images: [
      {
        url: {
          type: String,
          required: true,
        },
        alt: String,
        order: {
          type: Number,
          default: 0,
        },
      },
    ],
    thumbnail_image: {
      url: String,
      alt: String,
    },
    product_video_provider: String,
    product_video_url: String,

    // Attributes
    colors: [
      {
        name: String,
        hex: String,
        sku: String,
      },
    ],
    attributes: [
      {
        name: String,
        value: String,
      },
    ],
    tags: [String],

    // SEO
    meta_title: String,
    meta_description: String,
    meta_image: {
      url: String,
      alt: String,
    },

    // External
    external_link: String,
    external_link_button_text: String,

    // Search
    barcode: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
    search_keywords: [String],

    // Flags
    publish: {
      type: Boolean,
      default: false,
      index: true,
    },
    cash_on_delivery: {
      type: Boolean,
      default: false,
    },
    is_featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    is_todays_deal: {
      type: Boolean,
      default: false,
    },

    // Flash deals
    flash_deal_title: String,
    flash_deal_discount: Number,
    flash_deal_discount_type: {
      type: String,
      enum: ['flat', 'percent'],
    },
  },
  {
    timestamps: true,
  }
);

// Text index on name, description, tags, category_snapshot.name, sku
productSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
  'category_snapshot.name': 'text',
  sku: 'text',
});

// Compound indexes
productSchema.index({ category: 1, publish: 1, unit_price: 1 });
productSchema.index({ seller: 1, publish: 1 });

// Pre-save hook to update stock_status based on quantity
productSchema.pre('save', function (next) {
  if (this.isModified('quantity') || this.isModified('low_stock_quantity')) {
    if (this.quantity === 0) {
      this.stock_status = 'out_of_stock';
    } else if (this.quantity <= this.low_stock_quantity) {
      this.stock_status = 'low_stock';
    } else {
      this.stock_status = 'in_stock';
    }
  }
  next();
});

export default mongoose.model<IProduct>('Product', productSchema);
