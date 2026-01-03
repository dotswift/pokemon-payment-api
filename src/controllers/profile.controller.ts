import { Response, NextFunction } from 'express';
import { profileService, ShippingAddress } from '../services/profile.service';
import { AuthenticatedRequest } from '../middleware/supabaseAuth';
import { logger } from '../utils/logger';

class ProfileController {
  /**
   * GET /api/v1/profile/shipping-address
   * Get the user's shipping address
   */
  async getShippingAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const address = await profileService.getShippingAddress(userId);

      res.json({
        success: true,
        data: address,
      });
    } catch (error) {
      logger.error('Error getting shipping address', { error });
      next(error);
    }
  }

  /**
   * PUT /api/v1/profile/shipping-address
   * Save/update the user's shipping address
   */
  async saveShippingAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const address: ShippingAddress = req.body;

      // Validate required fields
      if (!address.street || !address.city || !address.state || !address.zip || !address.country) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: street, city, state, zip, and country are required',
        });
        return;
      }

      const savedAddress = await profileService.saveShippingAddress(userId, address);

      res.json({
        success: true,
        data: savedAddress,
      });
    } catch (error) {
      logger.error('Error saving shipping address', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/profile/has-shipping-address
   * Check if user has a valid shipping address
   */
  async hasShippingAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const hasAddress = await profileService.hasShippingAddress(userId);

      res.json({
        success: true,
        data: { hasShippingAddress: hasAddress },
      });
    } catch (error) {
      logger.error('Error checking shipping address', { error });
      next(error);
    }
  }
}

export const profileController = new ProfileController();
