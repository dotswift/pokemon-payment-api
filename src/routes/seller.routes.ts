import { Router, Request, Response, NextFunction } from 'express';
import { sellerController } from '../controllers/seller.controller';
import { supabaseAuth, AuthenticatedRequest } from '../middleware/supabaseAuth';

const router = Router();

// Helper to wrap authenticated handlers
const wrap = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthenticatedRequest, res, next);

// All routes require Supabase JWT auth
router.use(supabaseAuth);

// Seller earnings and payouts
router.get('/earnings', wrap(sellerController.getEarnings.bind(sellerController)));
router.get('/payouts', wrap(sellerController.getPayouts.bind(sellerController)));

// Seller sales and shipping
router.get('/sales', wrap(sellerController.getSales.bind(sellerController)));
router.post('/sales/:settlementId/tracking', wrap(sellerController.addTracking.bind(sellerController)));

// Listing details (for seller's own listings)
router.get('/listings/:listingId', wrap(sellerController.getListingDetails.bind(sellerController)));

export default router;
