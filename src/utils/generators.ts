import { nanoid } from 'nanoid';
import User from '@models/User.js';

/**
 * Generate a unique username
 */
export const generateUsername = async (baseName: string): Promise<string> => {
  const sanitized = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 12);

  let username = sanitized || 'user';
  let exists = await User.findOne({ username });

  if (!exists) {
    return username;
  }

  // Add random suffix if username exists
  let attempts = 0;
  while (exists && attempts < 10) {
    username = `${sanitized}${nanoid(4)}`;
    exists = await User.findOne({ username });
    attempts++;
  }

  return username;
};

/**
 * Generate a random password (8-12 characters with mixed case, numbers, and symbols)
 */
export const generatePassword = (): string => {
  const length = Math.floor(Math.random() * 5) + 8; // 8-12 characters
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = lowercase + uppercase + numbers + symbols;

  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

/**
 * Generate a unique barcode
 */
export const generateBarcode = (): string => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `${timestamp}${random}`;
};

/**
 * Generate order number
 */
export const generateOrderNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = nanoid(6).toUpperCase();
  return `ORD-${year}${month}${day}-${random}`;
};

/**
 * Generate transaction reference
 */
export const generateTransactionRef = (): string => {
  const timestamp = Date.now();
  const random = nanoid(8).toUpperCase();
  return `TXN-${timestamp}-${random}`;
};

/**
 * Generate slug from string
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Create category snapshot for product
 */
export const createCategorySnapshot = (category: any) => {
  if (!category) return undefined;
  return {
    id: category._id || category.id,
    name: category.name,
    slug: category.slug,
  };
};

/**
 * Create brand snapshot for product
 */
export const createBrandSnapshot = (brand: any) => {
  if (!brand) return undefined;
  return {
    id: brand._id || brand.id,
    name: brand.name,
  };
};

/**
 * Calculate stock status based on quantity and low_stock_quantity
 */
export const calculateStockStatus = (
  quantity: number,
  lowStockQuantity: number
): 'in_stock' | 'low_stock' | 'out_of_stock' => {
  if (quantity === 0) {
    return 'out_of_stock';
  }
  if (quantity <= lowStockQuantity) {
    return 'low_stock';
  }
  return 'in_stock';
};

