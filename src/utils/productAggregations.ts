import { Types } from 'mongoose';
import Product from '@models/Product.js';

/**
 * Aggregation pipeline for products by category with price filter and pagination
 * @param categoryId - Category ID to filter by
 * @param minPrice - Minimum price filter (optional)
 * @param maxPrice - Maximum price filter (optional)
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 20)
 * @param sortBy - Field to sort by (default: 'createdAt')
 * @param order - Sort order: 'asc' or 'desc' (default: 'desc')
 */
export const productsByCategoryWithPriceFilter = async (
  categoryId: string | Types.ObjectId,
  options: {
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
    publish?: boolean;
  } = {}
) => {
  const {
    minPrice,
    maxPrice,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    order = 'desc',
    publish = true,
  } = options;

  const matchStage: any = {
    category: new Types.ObjectId(categoryId),
    publish: publish,
  };

  // Add price filter if provided
  if (minPrice !== undefined || maxPrice !== undefined) {
    matchStage.unit_price = {};
    if (minPrice !== undefined) {
      matchStage.unit_price.$gte = minPrice;
    }
    if (maxPrice !== undefined) {
      matchStage.unit_price.$lte = maxPrice;
    }
  }

  const pipeline = [
    // Match stage
    { $match: matchStage },

    // Sort stage
    { $sort: { [sortBy]: order === 'asc' ? 1 : -1 } },

    // Facet for pagination and total count
    {
      $facet: {
        products: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              __v: 0,
            },
          },
        ],
        total: [{ $count: 'count' }],
      },
    },

    // Unwind total array
    {
      $unwind: {
        path: '$total',
        preserveNullAndEmptyArrays: true,
      },
    },

    // Add metadata
    {
      $addFields: {
        total: { $ifNull: ['$total.count', 0] },
        page: page,
        limit: limit,
        totalPages: {
          $ceil: {
            $divide: [{ $ifNull: ['$total.count', 0] }, limit],
          },
        },
      },
    },
  ];

  const result = await Product.aggregate(pipeline);
  return result[0] || { products: [], total: 0, page, limit, totalPages: 0 };
};

/**
 * Aggregation pipeline for text search with relevance sorting
 * @param searchText - Text to search for
 * @param options - Additional options (filters, pagination, etc.)
 */
export const textSearchWithRelevance = async (
  searchText: string,
  options: {
    category?: string | Types.ObjectId;
    brand?: string | Types.ObjectId;
    minPrice?: number;
    maxPrice?: number;
    publish?: boolean;
    page?: number;
    limit?: number;
  } = {}
) => {
  const {
    category,
    brand,
    minPrice,
    maxPrice,
    publish = true,
    page = 1,
    limit = 20,
  } = options;

  const matchStage: any = {
    $text: { $search: searchText },
    publish: publish,
  };

  // Add filters
  if (category) {
    matchStage.category = new Types.ObjectId(category);
  }
  if (brand) {
    matchStage.brand = new Types.ObjectId(brand);
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    matchStage.unit_price = {};
    if (minPrice !== undefined) {
      matchStage.unit_price.$gte = minPrice;
    }
    if (maxPrice !== undefined) {
      matchStage.unit_price.$lte = maxPrice;
    }
  }

  const pipeline = [
    // Match stage with text search
    { $match: matchStage },

    // Add relevance score
    {
      $addFields: {
        score: { $meta: 'textScore' },
      },
    },

    // Sort by relevance (score) first, then by createdAt
    {
      $sort: {
        score: { $meta: 'textScore' },
        createdAt: -1,
      },
    },

    // Facet for pagination and total count
    {
      $facet: {
        products: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              __v: 0,
            },
          },
        ],
        total: [{ $count: 'count' }],
      },
    },

    // Unwind total array
    {
      $unwind: {
        path: '$total',
        preserveNullAndEmptyArrays: true,
      },
    },

    // Add metadata
    {
      $addFields: {
        total: { $ifNull: ['$total.count', 0] },
        page: page,
        limit: limit,
        totalPages: {
          $ceil: {
            $divide: [{ $ifNull: ['$total.count', 0] }, limit],
          },
        },
      },
    },
  ];

  const result = await Product.aggregate(pipeline);
  return result[0] || { products: [], total: 0, page, limit, totalPages: 0 };
};


