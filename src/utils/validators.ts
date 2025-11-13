import { z } from 'zod';

// User validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Product validation schemas
const discountSchema = z
  .object({
    type: z.enum(['flat', 'percent', 'none']),
    value: z.number().min(0).optional(),
    start_at: z.string().datetime().optional(),
    end_at: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'none') return true;
      if (data.start_at && data.end_at) {
        return new Date(data.end_at) > new Date(data.start_at);
      }
      return true;
    },
    {
      message: 'Discount end date must be after start date',
    }
  );

const vatTaxSchema = z.object({
  type: z.enum(['flat', 'percent', 'none']),
  value: z.number().min(0).optional(),
});

const galleryImageSchema = z.object({
  url: z.string().url('Invalid image URL'),
  alt: z.string().optional(),
  order: z.number().int().min(0).default(0),
});

const thumbnailImageSchema = z.object({
  url: z.string().url('Invalid image URL'),
  alt: z.string().optional(),
});

const metaImageSchema = z.object({
  url: z.string().url('Invalid image URL'),
  alt: z.string().optional(),
});

const colorSchema = z.object({
  name: z.string().min(1),
  hex: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  sku: z.string().optional(),
});

const attributeSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
});

export const createProductSchema = z.object({
  // Required fields
  name: z.string().min(1, 'Product name is required').max(500),
  description: z.string().max(10000).optional(),
  sku: z.string().min(1, 'SKU is required').max(100),
  unit: z.string().min(1, 'Unit is required').max(50),
  unit_price: z.number().positive('Unit price must be positive'),

  // Category and Brand
  category: z.string().optional(),
  brand: z.string().optional(),

  // Seller
  seller: z.string().nullable().optional(),
  is_in_house: z.boolean().default(true),

  // Pricing
  weight: z.number().min(0).optional(),
  quantity: z.number().int().min(0).default(0),
  is_quantity_multiplying: z.boolean().default(false),

  // Stock
  low_stock_quantity: z.number().int().min(0).default(0),
  show_stock_quantity: z.boolean().default(true),
  show_stock_text_only: z.boolean().default(false),
  hide_stock: z.boolean().default(false),

  // Discount
  discount: discountSchema.optional(),

  // VAT/Tax
  vat_tax: vatTaxSchema.optional(),

  // Shipping
  free_shipping: z.boolean().default(false),
  free_shipping_flat_rate: z.number().min(0).optional(),
  shipping_cost: z.number().min(0).optional(),
  estimate_shipping_time: z.string().max(200).optional(),

  // Media
  gallery_images: z.array(galleryImageSchema).max(20, 'Maximum 20 gallery images allowed').optional(),
  thumbnail_image: thumbnailImageSchema.optional(),
  product_video_provider: z.string().max(100).optional(),
  product_video_url: z.string().url('Invalid video URL').optional(),

  // Attributes
  colors: z.array(colorSchema).optional(),
  attributes: z.array(attributeSchema).optional(),
  tags: z.array(z.string().max(100)).optional(),

  // SEO
  meta_title: z.string().max(200).optional(),
  meta_description: z.string().max(500).optional(),
  meta_image: metaImageSchema.optional(),

  // External
  external_link: z.string().url('Invalid external link URL').optional(),
  external_link_button_text: z.string().max(100).optional(),

  // Search
  barcode: z.string().max(100).optional(),
  search_keywords: z.array(z.string().max(100)).optional(),

  // Flags
  publish: z.boolean().default(false),
  cash_on_delivery: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  is_todays_deal: z.boolean().default(false),

  // Flash deals
  flash_deal_title: z.string().max(200).optional(),
  flash_deal_discount: z.number().min(0).optional(),
  flash_deal_discount_type: z.enum(['flat', 'percent']).optional(),
});

export const updateProductSchema = createProductSchema.partial();

// Stock adjustment schema
export const adjustStockSchema = z.object({
  change: z.number().refine((val) => val !== 0, {
    message: 'Change amount must not be zero',
  }),
  type: z.enum(['in', 'out', 'adjustment']),
  reason: z.string().max(500).optional(),
  reference: z.string().max(200).optional(),
});

// Category validation schemas
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().optional(),
  image: z.string().optional(),
  icon: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.array(z.string()).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

// Order validation schemas
export const createOrderSchema = z.object({
  customerId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        price: z.number().positive(),
      })
    )
    .min(1, 'Order must have at least one item'),
  shippingAddress: z
    .object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      country: z.string(),
      zipCode: z.string(),
      phone: z.string(),
    })
    .optional(),
  paymentMethod: z.enum(['cash', 'card', 'online', 'bank_transfer']).default('cash'),
  notes: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'pending',
    'processing',
    'confirmed',
    'shipped',
    'delivered',
    'cancelled',
    'rejected',
    'returned',
  ]),
  notes: z.string().optional(),
});

// Supplier validation schemas
export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().min(1, 'Phone number is required'),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      zipCode: z.string().optional(),
    })
    .optional(),
  company: z.string().optional(),
  taxId: z.string().optional(),
  website: z.string().url().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateSupplierSchema = createSupplierSchema.partial();

// Settings validation schemas
export const updateCompanySettingsSchema = z.object({
  companyName: z.string().optional(),
  logo: z.string().optional(),
  favicon: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
  currency: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  footer: z.string().optional(),
  socialMedia: z
    .object({
      facebook: z.string().optional(),
      twitter: z.string().optional(),
      instagram: z.string().optional(),
      linkedin: z.string().optional(),
    })
    .optional(),
});

// Transaction validation schemas
export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  category: z.enum(['sale', 'purchase', 'return', 'damage', 'other']),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional(),
  reference: z.string().optional(),
  relatedEntity: z
    .object({
      entityType: z.enum(['order', 'product', 'supplier', 'customer']),
      entityId: z.string(),
    })
    .optional(),
});

// Brand validation schemas
export const createBrandSchema = z.object({
  name: z.string().min(1, 'Brand name is required').max(200),
  slug: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  logo: z.string().url('Invalid logo URL').optional(),
  website: z.string().url('Invalid website URL').optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateBrandSchema = createBrandSchema.partial();

// Seller validation schemas
export const createSellerSchema = z.object({
  name: z.string().min(1, 'Seller name is required').max(200),
  slug: z.string().max(200).optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().max(50).optional(),
  address: z
    .object({
      street: z.string().max(200).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      country: z.string().max(100).optional(),
      zipCode: z.string().max(20).optional(),
    })
    .optional(),
  logo: z.string().url('Invalid logo URL').optional(),
  rating: z.number().min(0).max(5).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateSellerSchema = createSellerSchema.partial();

