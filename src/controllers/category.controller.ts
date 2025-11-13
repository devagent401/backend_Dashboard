import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import Category from '@models/Category.js';
import Product from '@models/Product.js';
import ApiError from '@utils/ApiError.js';
import ApiResponse from '@utils/ApiResponse.js';
import { generateSlug } from '@utils/generators.js';

/**
 * Get all categories (tree structure)
 * GET /api/v1/categories
 */
export const getCategories = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { flat = 'false', status } = req.query;

    const query: any = {};
    if (status) query.status = status;

    if (flat === 'true') {
      // Return flat list
      const categories = await Category.find(query).sort({ order: 1, name: 1 });
      res.json(ApiResponse.success(categories));
    } else {
      // Return tree structure
      const categories = await Category.find({ ...query, parentId: null }).sort({
        order: 1,
        name: 1,
      });

      const buildTree = async (parentId: any, level = 1) => {
        const children = await Category.find({ ...query, parentId }).sort({
          order: 1,
          name: 1,
        });

        return Promise.all(
          children.map(async child => ({
            ...child.toJSON(),
            children: await buildTree(child._id, level + 1),
          }))
        );
      };

      const tree = await Promise.all(
        categories.map(async cat => ({
          ...cat.toJSON(),
          children: await buildTree(cat._id),
        }))
      );

      res.json(ApiResponse.success(tree));
    }
  }
);

/**
 * Get category by ID
 * GET /api/v1/categories/:id
 */
export const getCategoryById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const category = await Category.findById(req.params.id)
      .populate('parentId', 'name slug')
      .populate('ancestors', 'name slug');

    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    // Get children
    const children = await Category.find({ parentId: category._id }).sort({
      order: 1,
      name: 1,
    });

    res.json(
      ApiResponse.success({
        ...category.toJSON(),
        children,
      })
    );
  }
);

/**
 * Get category by slug
 * GET /api/v1/categories/slug/:slug
 */
export const getCategoryBySlug = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const category = await Category.findOne({ slug: req.params.slug })
      .populate('parentId', 'name slug')
      .populate('ancestors', 'name slug');

    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    // Get children
    const children = await Category.find({ parentId: category._id }).sort({
      order: 1,
      name: 1,
    });

    res.json(
      ApiResponse.success({
        ...category.toJSON(),
        children,
      })
    );
  }
);

/**
 * Create category
 * POST /api/v1/categories
 */
export const createCategory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const data = req.body;

    // Generate slug
    data.slug = data.slug || generateSlug(data.name);

    // Verify parent category exists
    if (data.parentId) {
      const parent = await Category.findById(data.parentId);
      if (!parent) {
        throw ApiError.badRequest('Parent category not found');
      }

      // Prevent deep nesting (max 5 levels)
      if (parent.level >= 4) {
        throw ApiError.badRequest('Maximum category nesting level reached');
      }
    }

    const category = await Category.create(data);

    res.status(201).json(ApiResponse.created(category, 'Category created successfully'));
  }
);

/**
 * Update category
 * PUT /api/v1/categories/:id
 */
export const updateCategory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const category = await Category.findById(req.params.id);

    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    const data = req.body;

    // Update slug if name changed
    if (data.name && data.name !== category.name) {
      data.slug = generateSlug(data.name);
    }

    // Verify new parent
    if (data.parentId && data.parentId !== category.parentId?.toString()) {
      if (data.parentId === category._id.toString()) {
        throw ApiError.badRequest('Category cannot be its own parent');
      }

      const parent = await Category.findById(data.parentId);
      if (!parent) {
        throw ApiError.badRequest('Parent category not found');
      }

      // Check if new parent is a descendant (would create circular reference)
      if (parent.ancestors.includes(category._id)) {
        throw ApiError.badRequest('Cannot move category to its own descendant');
      }

      if (parent.level >= 4) {
        throw ApiError.badRequest('Maximum category nesting level reached');
      }
    }

    Object.assign(category, data);
    await category.save();

    // Update all descendants' ancestors
    if (data.parentId && data.parentId !== category.parentId) {
      const descendants = await Category.find({
        ancestors: category._id,
      });

      for (const desc of descendants) {
        const parent = await Category.findById(desc.parentId);
        if (parent) {
          desc.ancestors = [...parent.ancestors, parent._id];
          desc.level = parent.level + 1;
          await desc.save();
        }
      }
    }

    res.json(ApiResponse.updated(category));
  }
);

/**
 * Delete category
 * DELETE /api/v1/categories/:id
 */
export const deleteCategory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const category = await Category.findById(req.params.id);

    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    // Check if category has children
    const hasChildren = await Category.exists({ parentId: category._id });
    if (hasChildren) {
      throw ApiError.badRequest('Cannot delete category with subcategories');
    }

    // Check if category has products
    const hasProducts = await Product.exists({ categoryId: category._id });
    if (hasProducts) {
      throw ApiError.badRequest('Cannot delete category with products');
    }

    await category.deleteOne();

    res.json(ApiResponse.deleted('Category deleted successfully'));
  }
);

/**
 * Get category products
 * GET /api/v1/categories/:id/products
 */
export const getCategoryProducts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 20 } = req.query;

    const category = await Category.findById(req.params.id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    // Get this category and all descendants
    const categoryIds = [
      category._id,
      ...(await Category.find({ ancestors: category._id }).distinct('_id')),
    ];

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find({ categoryId: { $in: categoryIds }, status: 'active' })
        .populate('categoryId', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments({ categoryId: { $in: categoryIds }, status: 'active' }),
    ]);

    res.json(
      ApiResponse.successWithMeta(products, {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      })
    );
  }
);

