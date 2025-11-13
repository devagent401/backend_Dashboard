import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import Supplier from '@models/Supplier.js';
import ApiError from '@utils/ApiError.js';
import ApiResponse from '@utils/ApiResponse.js';

/**
 * Get all suppliers
 * GET /api/v1/suppliers
 */
export const getSuppliers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 20, search, status } = req.query;

    const query: any = {};

    if (search) {
      query.$text = { $search: search as string };
    }

    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [suppliers, total] = await Promise.all([
      Supplier.find(query).sort({ name: 1 }).skip(skip).limit(Number(limit)),
      Supplier.countDocuments(query),
    ]);

    res.json(
      ApiResponse.successWithMeta(suppliers, {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      })
    );
  }
);

/**
 * Get supplier by ID
 * GET /api/v1/suppliers/:id
 */
export const getSupplierById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      throw ApiError.notFound('Supplier not found');
    }

    res.json(ApiResponse.success(supplier));
  }
);

/**
 * Create supplier
 * POST /api/v1/suppliers
 */
export const createSupplier = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const supplier = await Supplier.create(req.body);

    res.status(201).json(ApiResponse.created(supplier, 'Supplier created successfully'));
  }
);

/**
 * Update supplier
 * PUT /api/v1/suppliers/:id
 */
export const updateSupplier = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      throw ApiError.notFound('Supplier not found');
    }

    Object.assign(supplier, req.body);
    await supplier.save();

    res.json(ApiResponse.updated(supplier));
  }
);

/**
 * Delete supplier
 * DELETE /api/v1/suppliers/:id
 */
export const deleteSupplier = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      throw ApiError.notFound('Supplier not found');
    }

    await supplier.deleteOne();

    res.json(ApiResponse.deleted('Supplier deleted successfully'));
  }
);

/**
 * Add purchase history
 * POST /api/v1/suppliers/:id/purchases
 */
export const addPurchaseHistory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      throw ApiError.notFound('Supplier not found');
    }

    const { productId, productName, quantity, unitPrice, invoiceNumber } = req.body;
    const totalAmount = quantity * unitPrice;

    supplier.purchaseHistory.push({
      date: new Date(),
      productId,
      productName,
      quantity,
      unitPrice,
      totalAmount,
      invoiceNumber,
    });

    supplier.totalPurchaseAmount += totalAmount;
    supplier.lastPurchaseDate = new Date();

    await supplier.save();

    res.json(ApiResponse.success(supplier, 'Purchase history added'));
  }
);

/**
 * Get supplier purchase history
 * GET /api/v1/suppliers/:id/purchases
 */
export const getSupplierPurchases = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      throw ApiError.notFound('Supplier not found');
    }

    const purchases = supplier.purchaseHistory.sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );

    res.json(ApiResponse.success(purchases));
  }
);

