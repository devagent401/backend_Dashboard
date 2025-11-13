import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Seller from '@models/Seller.js';
import ApiError from '@utils/ApiError.js';
import ApiResponse from '@utils/ApiResponse.js';
import { generateSlug } from '@utils/generators.js';

/**
 * Get all sellers
 * GET /api/v1/sellers
 */
export const getSellers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 20, search, status, sortBy = 'name', order = 'asc' } = req.query;

    const query: any = {};

    if (status) query.status = status;
    if (search) {
      query.$text = { $search: search as string };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = { [sortBy as string]: order === 'asc' ? 1 : -1 };

    const [sellers, total] = await Promise.all([
      Seller.find(query).sort(sort).skip(skip).limit(Number(limit)),
      Seller.countDocuments(query),
    ]);

    res.json(
      ApiResponse.successWithMeta(
        sellers,
        {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
        'Sellers fetched successfully'
      )
    );
  }
);

/**
 * Get seller by ID
 * GET /api/v1/sellers/:id
 */
export const getSellerById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const seller = await Seller.findById(req.params.id);

    if (!seller) {
      throw ApiError.notFound('Seller not found');
    }

    res.json(ApiResponse.success(seller, 'Seller fetched successfully'));
  }
);

/**
 * Create seller
 * POST /api/v1/sellers
 */
export const createSeller = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const data = req.body;

    // Generate slug if not provided
    if (!data.slug) {
      data.slug = generateSlug(data.name);
    }

    // Check if slug already exists
    const existingSeller = await Seller.findOne({ slug: data.slug });
    if (existingSeller) {
      throw ApiError.badRequest('Seller with this slug already exists');
    }

    // Check if email already exists (if provided)
    if (data.email) {
      const existingEmail = await Seller.findOne({ email: data.email });
      if (existingEmail) {
        throw ApiError.badRequest('Seller with this email already exists');
      }
    }

    const seller = await Seller.create(data);

    res.status(201).json(ApiResponse.created(seller, 'Seller created successfully'));
  }
);

/**
 * Update seller
 * PUT /api/v1/sellers/:id
 */
export const updateSeller = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const seller = await Seller.findById(req.params.id);

    if (!seller) {
      throw ApiError.notFound('Seller not found');
    }

    const data = req.body;

    // Update slug if name changed
    if (data.name && data.name !== seller.name) {
      data.slug = generateSlug(data.name);
      // Check if new slug already exists
      const existingSeller = await Seller.findOne({ slug: data.slug, _id: { $ne: seller._id } });
      if (existingSeller) {
        throw ApiError.badRequest('Seller with this slug already exists');
      }
    }

    // Check if email already exists (if changed)
    if (data.email && data.email !== seller.email) {
      const existingEmail = await Seller.findOne({ email: data.email, _id: { $ne: seller._id } });
      if (existingEmail) {
        throw ApiError.badRequest('Seller with this email already exists');
      }
    }

    Object.assign(seller, data);
    await seller.save();

    res.json(ApiResponse.updated(seller, 'Seller updated successfully'));
  }
);

/**
 * Delete seller
 * DELETE /api/v1/sellers/:id
 */
export const deleteSeller = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const seller = await Seller.findById(req.params.id);

    if (!seller) {
      throw ApiError.notFound('Seller not found');
    }

    await seller.deleteOne();

    res.json(ApiResponse.deleted('Seller deleted successfully'));
  }
);


