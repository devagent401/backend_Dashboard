import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Brand from '@models/Brand.js';
import ApiError from '@utils/ApiError.js';
import ApiResponse from '@utils/ApiResponse.js';
import { generateSlug } from '@utils/generators.js';

/**
 * Get all brands
 * GET /api/v1/brands
 */
export const getBrands = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 20, search, status, sortBy = 'name', order = 'asc' } = req.query;

    const query: any = {};

    if (status) query.status = status;
    if (search) {
      query.$text = { $search: search as string };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = { [sortBy as string]: order === 'asc' ? 1 : -1 };

    const [brands, total] = await Promise.all([
      Brand.find(query).sort(sort).skip(skip).limit(Number(limit)),
      Brand.countDocuments(query),
    ]);

    res.json(
      ApiResponse.successWithMeta(
        brands,
        {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
        'Brands fetched successfully'
      )
    );
  }
);

/**
 * Get brand by ID
 * GET /api/v1/brands/:id
 */
export const getBrandById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      throw ApiError.notFound('Brand not found');
    }

    res.json(ApiResponse.success(brand, 'Brand fetched successfully'));
  }
);

/**
 * Create brand
 * POST /api/v1/brands
 */
export const createBrand = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const data = req.body;

    // Generate slug if not provided
    if (!data.slug) {
      data.slug = generateSlug(data.name);
    }

    // Check if slug already exists
    const existingBrand = await Brand.findOne({ slug: data.slug });
    if (existingBrand) {
      throw ApiError.badRequest('Brand with this slug already exists');
    }

    const brand = await Brand.create(data);

    res.status(201).json(ApiResponse.created(brand, 'Brand created successfully'));
  }
);

/**
 * Update brand
 * PUT /api/v1/brands/:id
 */
export const updateBrand = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      throw ApiError.notFound('Brand not found');
    }

    const data = req.body;

    // Update slug if name changed
    if (data.name && data.name !== brand.name) {
      data.slug = generateSlug(data.name);
      // Check if new slug already exists
      const existingBrand = await Brand.findOne({ slug: data.slug, _id: { $ne: brand._id } });
      if (existingBrand) {
        throw ApiError.badRequest('Brand with this slug already exists');
      }
    }

    Object.assign(brand, data);
    await brand.save();

    res.json(ApiResponse.updated(brand, 'Brand updated successfully'));
  }
);

/**
 * Delete brand
 * DELETE /api/v1/brands/:id
 */
export const deleteBrand = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      throw ApiError.notFound('Brand not found');
    }

    await brand.deleteOne();

    res.json(ApiResponse.deleted('Brand deleted successfully'));
  }
);


