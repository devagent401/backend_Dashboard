import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Product from '@models/Product.js';
import Category from '@models/Category.js';
import Brand from '@models/Brand.js';
import Seller from '@models/Seller.js';
import InventoryMovement from '@models/InventoryMovement.js';
import ApiError from '@utils/ApiError.js';
import ApiResponse from '@utils/ApiResponse.js';
import { generateSlug, generateBarcode, createCategorySnapshot, createBrandSnapshot, calculateStockStatus } from '@utils/generators.js';
import { AuthRequest } from '@middlewares/auth.middleware.js';

/**
 * Get all products with advanced filtering
 * GET /api/v1/products
 */
export const getProducts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      page = 1,
      limit = 20,
      q, // text search
      category,
      brand,
      seller,
      min_price,
      max_price,
      tags,
      publish,
      featured,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const query: any = {};

    // Text search
    if (q) {
      query.$text = { $search: q as string };
    }

    // Filters
    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (seller !== undefined) {
      if (seller === 'null' || seller === '') {
        query.seller = null;
      } else {
        query.seller = seller;
      }
    }
    if (publish !== undefined) query.publish = publish === 'true';
    if (featured !== undefined) query.is_featured = featured === 'true';

    // Price range
    if (min_price || max_price) {
      query.unit_price = {};
      if (min_price) query.unit_price.$gte = Number(min_price);
      if (max_price) query.unit_price.$lte = Number(max_price);
    }

    // Tags filter
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = { [sortBy as string]: order === 'asc' ? 1 : -1 };

    // If text search, add relevance score
    if (q) {
      sort.score = { $meta: 'textScore' };
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .select('-__v')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    res.json(
      ApiResponse.successWithMeta(
        products,
        {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
        'Products fetched successfully'
      )
    );
  }
);

/**
 * Get product by ID
 * GET /api/v1/products/:id
 */
export const getProductById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const product = await Product.findById(req.params.id).select('-__v');

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    // Populate seller if marketplace product
    let sellerDetails = null;
    if (product.seller && !product.is_in_house) {
      sellerDetails = await Seller.findById(product.seller).select('name logo rating');
    }

    res.json(
      ApiResponse.success({
        ...product.toObject(),
        seller_details: sellerDetails,
      })
    );
  }
);

/**
 * Get product by slug
 * GET /api/v1/products/slug/:slug
 */
export const getProductBySlug = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const product = await Product.findOne({ slug: req.params.slug, publish: true }).select('-__v');

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    // Populate seller if marketplace product
    let sellerDetails = null;
    if (product.seller && !product.is_in_house) {
      sellerDetails = await Seller.findById(product.seller).select('name logo rating');
    }

    res.json(
      ApiResponse.success({
        ...product.toObject(),
        seller_details: sellerDetails,
      })
    );
  }
);

/**
 * Get product by barcode
 * GET /api/v1/products/barcode/:barcode
 */
export const getProductByBarcode = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const product = await Product.findOne({ barcode: req.params.barcode }).select('-__v');

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    res.json(
      ApiResponse.success({
        id: product._id,
        name: product.name,
        unit_price: product.unit_price,
        barcode: product.barcode,
        quantity: product.quantity,
        stock_status: product.stock_status,
        thumbnail_image: product.thumbnail_image,
      })
    );
  }
);

/**
 * Create product
 * POST /api/v1/products
 */
export const createProduct = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const data = req.body;

    // Validate required fields
    if (!data.name || !data.sku || !data.unit_price || !data.unit) {
      throw ApiError.badRequest('Missing required fields: name, sku, unit_price, unit');
    }

    // Generate slug
    data.slug = generateSlug(data.name);

    // Check SKU uniqueness
    const existingSku = await Product.findOne({ sku: data.sku });
    if (existingSku) {
      throw ApiError.conflict('Product with this SKU already exists');
    }

    // Check slug uniqueness
    const existingSlug = await Product.findOne({ slug: data.slug });
    if (existingSlug) {
      data.slug = `${data.slug}-${Date.now()}`;
    }

    // Generate barcode if not provided
    if (!data.barcode) {
      data.barcode = generateBarcode();
    }

    // Verify and snapshot category
    if (data.category) {
      const category = await Category.findById(data.category);
      if (!category) {
        throw ApiError.badRequest('Invalid category');
      }
      data.category_snapshot = createCategorySnapshot(category);
    }

    // Verify and snapshot brand
    if (data.brand) {
      const brand = await Brand.findById(data.brand);
      if (!brand) {
        throw ApiError.badRequest('Invalid brand');
      }
      data.brand_snapshot = createBrandSnapshot(brand);
    }

    // Calculate stock status
    if (data.quantity !== undefined && data.low_stock_quantity !== undefined) {
      data.stock_status = calculateStockStatus(data.quantity, data.low_stock_quantity);
    }

    // Validate discount dates
    if (data.discount && data.discount.start_at && data.discount.end_at) {
      if (new Date(data.discount.end_at) <= new Date(data.discount.start_at)) {
        throw ApiError.badRequest('Discount end date must be after start date');
      }
    }

    // Limit gallery images to 20
    if (data.gallery_images && data.gallery_images.length > 20) {
      data.gallery_images = data.gallery_images.slice(0, 20);
    }

    const product = await Product.create(data);

    // Update category product count
    if (product.category) {
      await Category.findByIdAndUpdate(product.category, {
        $inc: { productCount: 1 },
      });
    }

    res.status(201).json(ApiResponse.created(product, 'Product created successfully'));
  }
);

/**
 * Update product
 * PUT /api/v1/products/:id
 */
export const updateProduct = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const product = await Product.findById(req.params.id);

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    const oldCategoryId = product.category?.toString();
    const oldBrandId = product.brand?.toString();
    const data = req.body;

    // Update slug if name changed
    if (data.name && data.name !== product.name) {
      data.slug = generateSlug(data.name);
      // Check slug uniqueness
      const existingSlug = await Product.findOne({ slug: data.slug, _id: { $ne: product._id } });
      if (existingSlug) {
        data.slug = `${data.slug}-${Date.now()}`;
      }
    }

    // Check SKU uniqueness if changed
    if (data.sku && data.sku !== product.sku) {
      const existingSku = await Product.findOne({ sku: data.sku, _id: { $ne: product._id } });
      if (existingSku) {
        throw ApiError.conflict('Product with this SKU already exists');
      }
    }

    // Update category snapshot if category changed
    if (data.category && data.category !== oldCategoryId) {
      const category = await Category.findById(data.category);
      if (!category) {
        throw ApiError.badRequest('Invalid category');
      }
      data.category_snapshot = createCategorySnapshot(category);
    }

    // Update brand snapshot if brand changed
    if (data.brand && data.brand !== oldBrandId) {
      const brand = await Brand.findById(data.brand);
      if (!brand) {
        throw ApiError.badRequest('Invalid brand');
      }
      data.brand_snapshot = createBrandSnapshot(brand);
    }

    // Calculate stock status if quantity changed
    if (data.quantity !== undefined) {
      const lowStockQty = data.low_stock_quantity !== undefined ? data.low_stock_quantity : product.low_stock_quantity;
      data.stock_status = calculateStockStatus(data.quantity, lowStockQty);
    }

    // Validate discount dates
    if (data.discount && data.discount.start_at && data.discount.end_at) {
      if (new Date(data.discount.end_at) <= new Date(data.discount.start_at)) {
        throw ApiError.badRequest('Discount end date must be after start date');
      }
    }

    // Limit gallery images to 20
    if (data.gallery_images && data.gallery_images.length > 20) {
      data.gallery_images = data.gallery_images.slice(0, 20);
    }

    Object.assign(product, data);
    await product.save();

    // Update category counts
    if (data.category && data.category !== oldCategoryId) {
      if (oldCategoryId) {
        await Category.findByIdAndUpdate(oldCategoryId, {
          $inc: { productCount: -1 },
        });
      }
      await Category.findByIdAndUpdate(data.category, {
        $inc: { productCount: 1 },
      });
    }

    res.json(ApiResponse.updated(product, 'Product updated successfully'));
  }
);

/**
 * Delete product (soft or hard delete)
 * DELETE /api/v1/products/:id
 */
export const deleteProduct = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const product = await Product.findById(req.params.id);

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    const deleteMode = process.env.PRODUCT_DELETE_MODE || 'soft';

    if (deleteMode === 'hard') {
      const categoryId = product.category;
      await product.deleteOne();

      // Update category product count
      if (categoryId) {
        await Category.findByIdAndUpdate(categoryId, {
          $inc: { productCount: -1 },
        });
      }
    } else {
      // Soft delete: set publish to false
      product.publish = false;
      await product.save();
    }

    res.json(ApiResponse.deleted('Product deleted successfully'));
  }
);

/**
 * Adjust product stock (atomic update)
 * POST /api/v1/products/:id/stock
 */
export const adjustStock = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { change, type, reason, reference } = req.body;
    const productId = req.params.id;

    if (!change || !type) {
      throw ApiError.badRequest('Missing required fields: change, type');
    }

    const changeAmount = Number(change);
    if (isNaN(changeAmount) || changeAmount === 0) {
      throw ApiError.badRequest('Change amount must be a non-zero number');
    }

    // Get current product state
    const product = await Product.findById(productId);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    const previousQuantity = product.quantity;
    let newQuantity: number;

    // Determine movement type
    let movementType: 'in' | 'out' | 'adjustment' = 'adjustment';
    if (type === 'in' || changeAmount > 0) {
      movementType = 'in';
      newQuantity = previousQuantity + Math.abs(changeAmount);
    } else if (type === 'out' || changeAmount < 0) {
      movementType = 'out';
      const requestedAmount = Math.abs(changeAmount);
      if (previousQuantity < requestedAmount) {
        throw ApiError.badRequest(`Insufficient stock. Available: ${previousQuantity}, Requested: ${requestedAmount}`);
      }
      newQuantity = previousQuantity - requestedAmount;
    } else {
      newQuantity = changeAmount; // Direct adjustment
    }

    // Atomic update using findOneAndUpdate
    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: productId,
        ...(movementType === 'out' ? { quantity: { $gte: Math.abs(changeAmount) } } : {}),
      },
      {
        $inc: { quantity: changeAmount },
        $set: {
          stock_status: calculateStockStatus(newQuantity, product.low_stock_quantity),
        },
      },
      { new: true }
    );

    if (!updatedProduct) {
      if (movementType === 'out') {
        throw ApiError.badRequest('Insufficient stock for this operation');
      }
      throw ApiError.notFound('Product not found or could not be updated');
    }

    // Create inventory movement record
    await InventoryMovement.create({
      product: productId,
      type: movementType,
      quantity: Math.abs(changeAmount),
      previous_quantity: previousQuantity,
      new_quantity: updatedProduct.quantity,
      reason: reason || `Stock ${movementType === 'in' ? 'added' : movementType === 'out' ? 'removed' : 'adjusted'}`,
      reference: reference,
      created_by: req.user?._id,
    });

    res.json(
      ApiResponse.updated(
        {
          product: updatedProduct,
          movement: {
            type: movementType,
            previous_quantity: previousQuantity,
            new_quantity: updatedProduct.quantity,
            change: changeAmount,
          },
        },
        'Stock adjusted successfully'
      )
    );
  }
);

/**
 * Get low stock products
 * GET /api/v1/products/stock/low
 */
export const getLowStockProducts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const products = await Product.find({
      stock_status: { $in: ['low_stock', 'out_of_stock'] },
      publish: true,
    })
      .select('-__v')
      .sort({ quantity: 1 });

    res.json(ApiResponse.success(products, 'Low stock products fetched'));
  }
);
