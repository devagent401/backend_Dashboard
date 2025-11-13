import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  companyName: string;
  logo?: string;
  favicon?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  footer?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
  smtp?: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    secure?: boolean;
  };
  paymentGateways?: {
    stripe?: {
      enabled: boolean;
      publicKey?: string;
      secretKey?: string;
    };
    paypal?: {
      enabled: boolean;
      clientId?: string;
      clientSecret?: string;
    };
  };
  maintenance?: {
    enabled: boolean;
    message?: string;
  };
  features?: {
    enableReviews: boolean;
    enableWishlist: boolean;
    enableCompare: boolean;
    enableChat: boolean;
  };
}

const settingsSchema = new Schema<ISettings>(
  {
    companyName: {
      type: String,
      required: true,
      default: 'My E-Commerce Store',
    },
    logo: String,
    favicon: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
    currency: {
      type: String,
      default: 'USD',
    },
    currencySymbol: {
      type: String,
      default: '$',
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    footer: String,
    socialMedia: {
      facebook: String,
      twitter: String,
      instagram: String,
      linkedin: String,
      youtube: String,
    },
    smtp: {
      host: String,
      port: Number,
      user: String,
      password: String,
      secure: {
        type: Boolean,
        default: true,
      },
    },
    paymentGateways: {
      stripe: {
        enabled: {
          type: Boolean,
          default: false,
        },
        publicKey: String,
        secretKey: String,
      },
      paypal: {
        enabled: {
          type: Boolean,
          default: false,
        },
        clientId: String,
        clientSecret: String,
      },
    },
    maintenance: {
      enabled: {
        type: Boolean,
        default: false,
      },
      message: String,
    },
    features: {
      enableReviews: {
        type: Boolean,
        default: true,
      },
      enableWishlist: {
        type: Boolean,
        default: true,
      },
      enableCompare: {
        type: Boolean,
        default: true,
      },
      enableChat: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISettings>('Settings', settingsSchema);

