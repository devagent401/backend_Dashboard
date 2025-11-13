import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import Settings from '../models/Settings.js';
import logger from '../config/logger.js';
import { generateBarcode } from '../utils/generators.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';
    await mongoose.connect(mongoURI);
    logger.info('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Supplier.deleteMany({}),
      Settings.deleteMany({}),
    ]);
    logger.info('🗑️  Cleared existing data');

    // Create Users
    await User.create([
      {
        username: 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        password: process.env.ADMIN_PASSWORD || 'Admin@12345',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isEmailVerified: true,
      },
      {
        username: 'staff',
        email: 'staff@test.com',
        password: 'Staff@12345',
        firstName: 'Staff',
        lastName: 'User',
        role: 'staff',
        isEmailVerified: true,
      },
      {
        username: 'user1',
        email: 'user@test.com',
        password: 'User@12345',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        isEmailVerified: true,
      },
    ]);

    logger.info('✅ Created users');

    // Create Categories
    const electronics = await Category.create({
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and accessories',
      status: 'active',
      seoTitle: 'Electronics - Latest Gadgets',
      seoDescription: 'Shop the latest electronic devices and gadgets',
    });

    const smartphones = await Category.create({
      name: 'Smartphones',
      slug: 'electronics-smartphones',
      description: 'Latest smartphones and mobile devices',
      parentId: electronics._id,
      status: 'active',
    });

    const laptops = await Category.create({
      name: 'Laptops',
      slug: 'electronics-laptops',
      description: 'Laptops and notebooks',
      parentId: electronics._id,
      status: 'active',
    });

    const clothing = await Category.create({
      name: 'Clothing',
      slug: 'clothing',
      description: 'Fashion and apparel',
      status: 'active',
    });

    const menClothing = await Category.create({
      name: "Men's Clothing",
      slug: 'clothing-mens',
      description: "Men's fashion and apparel",
      parentId: clothing._id,
      status: 'active',
    });

    logger.info('✅ Created categories');

    // Create Suppliers
    const supplier1 = await Supplier.create({
      name: 'Tech Supplies Co.',
      email: 'contact@techsupplies.com',
      phone: '+1-555-0100',
      company: 'Tech Supplies Corporation',
      address: {
        street: '123 Tech Street',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        zipCode: '94105',
      },
      status: 'active',
    });

    const supplier2 = await Supplier.create({
      name: 'Fashion Wholesale',
      email: 'orders@fashionwholesale.com',
      phone: '+1-555-0200',
      company: 'Fashion Wholesale Inc.',
      address: {
        street: '456 Fashion Ave',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        zipCode: '10001',
      },
      status: 'active',
    });

    logger.info('✅ Created suppliers');

    // Create Products
    await Product.create([
      {
        name: 'iPhone 15 Pro',
        slug: 'iphone-15-pro',
        description: 'Latest iPhone with A17 Pro chip',
        price: 999,
        costPrice: 800,
        categoryId: smartphones._id,
        sku: 'IP15P-128-TIT',
        barcode: generateBarcode(),
        stockQuantity: 50,
        minStockLevel: 10,
        unit: 'piece',
        images: ['https://via.placeholder.com/300'],
        status: 'active',
        tags: ['smartphone', 'apple', 'iphone'],
        supplierId: supplier1._id,
      },
      {
        name: 'Samsung Galaxy S24',
        slug: 'samsung-galaxy-s24',
        description: 'Flagship Samsung smartphone',
        price: 899,
        costPrice: 700,
        categoryId: smartphones._id,
        sku: 'SGS24-256-BLK',
        barcode: generateBarcode(),
        stockQuantity: 40,
        minStockLevel: 10,
        unit: 'piece',
        images: ['https://via.placeholder.com/300'],
        status: 'active',
        tags: ['smartphone', 'samsung', 'android'],
        supplierId: supplier1._id,
      },
      {
        name: 'MacBook Pro 16"',
        slug: 'macbook-pro-16',
        description: 'Powerful laptop for professionals',
        price: 2499,
        costPrice: 2000,
        categoryId: laptops._id,
        sku: 'MBP16-M3-SLV',
        barcode: generateBarcode(),
        stockQuantity: 25,
        minStockLevel: 5,
        unit: 'piece',
        images: ['https://via.placeholder.com/300'],
        status: 'active',
        tags: ['laptop', 'apple', 'macbook'],
        supplierId: supplier1._id,
      },
      {
        name: 'Dell XPS 15',
        slug: 'dell-xps-15',
        description: 'Premium Windows laptop',
        price: 1799,
        costPrice: 1400,
        categoryId: laptops._id,
        sku: 'DXP15-I9-512',
        barcode: generateBarcode(),
        stockQuantity: 30,
        minStockLevel: 5,
        unit: 'piece',
        images: ['https://via.placeholder.com/300'],
        status: 'active',
        tags: ['laptop', 'dell', 'windows'],
        supplierId: supplier1._id,
      },
      {
        name: "Men's Classic T-Shirt",
        slug: 'mens-classic-tshirt',
        description: 'Comfortable cotton t-shirt',
        price: 29.99,
        costPrice: 15,
        categoryId: menClothing._id,
        sku: 'MCT-BLK-L',
        barcode: generateBarcode(),
        stockQuantity: 100,
        minStockLevel: 20,
        unit: 'piece',
        images: ['https://via.placeholder.com/300'],
        status: 'active',
        tags: ['clothing', 'mens', 'tshirt'],
        supplierId: supplier2._id,
      },
    ]);

    logger.info('✅ Created products');

    // Create Settings
    await Settings.create({
      companyName: 'E-Commerce Store',
      email: 'info@ecommerce.com',
      phone: '+1-555-1234',
      address: '123 Business St',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      zipCode: '10001',
      currency: 'USD',
      currencySymbol: '$',
      taxRate: 8.5,
      footer: '© 2024 E-Commerce Store. All rights reserved.',
    });

    logger.info('✅ Created settings');

    logger.info('\n✅ Database seeded successfully!');
    logger.info('\n📝 Login Credentials:');
    logger.info('Admin: admin@example.com / Admin@12345');
    logger.info('Staff: staff@test.com / Staff@12345');
    logger.info('User: user@test.com / User@12345');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();

