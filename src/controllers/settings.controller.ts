import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import Settings from '@models/Settings.js';
import ApiError from '@utils/ApiError.js';
import ApiResponse from '@utils/ApiResponse.js';

/**
 * Get settings
 * GET /api/v1/settings
 */
export const getSettings = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    let settings = await Settings.findOne();

    // Create default settings if none exist
    if (!settings) {
      settings = await Settings.create({
        companyName: 'My E-Commerce Store',
        currency: 'USD',
        currencySymbol: '$',
        taxRate: 0,
      });
    }

    res.json(ApiResponse.success(settings));
  }
);

/**
 * Update settings
 * PUT /api/v1/settings
 */
export const updateSettings = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      Object.assign(settings, req.body);
      await settings.save();
    }

    res.json(ApiResponse.updated(settings, 'Settings updated successfully'));
  }
);

/**
 * Update company info
 * PATCH /api/v1/settings/company
 */
export const updateCompanyInfo = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const settings = await Settings.findOne();

    if (!settings) {
      throw ApiError.notFound('Settings not found');
    }

    const { companyName, logo, favicon, email, phone, address, city, state, country, zipCode } =
      req.body;

    if (companyName) settings.companyName = companyName;
    if (logo) settings.logo = logo;
    if (favicon) settings.favicon = favicon;
    if (email) settings.email = email;
    if (phone) settings.phone = phone;
    if (address) settings.address = address;
    if (city) settings.city = city;
    if (state) settings.state = state;
    if (country) settings.country = country;
    if (zipCode) settings.zipCode = zipCode;

    await settings.save();

    res.json(ApiResponse.updated(settings, 'Company info updated'));
  }
);

/**
 * Update social media links
 * PATCH /api/v1/settings/social
 */
export const updateSocialMedia = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const settings = await Settings.findOne();

    if (!settings) {
      throw ApiError.notFound('Settings not found');
    }

    settings.socialMedia = {
      ...settings.socialMedia,
      ...req.body,
    };

    await settings.save();

    res.json(ApiResponse.updated(settings, 'Social media links updated'));
  }
);

/**
 * Toggle maintenance mode
 * PATCH /api/v1/settings/maintenance
 */
export const toggleMaintenance = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const settings = await Settings.findOne();

    if (!settings) {
      throw ApiError.notFound('Settings not found');
    }

    const { enabled, message } = req.body;

    settings.maintenance = {
      enabled: enabled !== undefined ? enabled : !settings.maintenance?.enabled,
      message: message || settings.maintenance?.message,
    };

    await settings.save();

    res.json(
      ApiResponse.updated(
        settings,
        `Maintenance mode ${settings.maintenance.enabled ? 'enabled' : 'disabled'}`
      )
    );
  }
);

