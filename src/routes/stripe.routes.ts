import { Router, Request, Response, NextFunction } from 'express';
import { stripeController } from '../controllers/stripe.controller';
import { supabaseAuth, AuthenticatedRequest } from '../middleware/supabaseAuth';
import { apiKeyAuth } from '../middleware/apiKeyAuth';

const router = Router();

// Helper to wrap authenticated handlers
const wrap = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthenticatedRequest, res, next);

// Settlement endpoint - requires API key (for cron/admin access)
router.post('/settle-auctions', apiKeyAuth, stripeController.settleAuctions.bind(stripeController));

// All other routes require Supabase JWT auth
router.use(supabaseAuth);

// Setup intent for saving payment methods
router.post('/setup-intent', wrap(stripeController.createSetupIntent.bind(stripeController)));

// Payment methods CRUD
router.get('/payment-methods', wrap(stripeController.listPaymentMethods.bind(stripeController)));
router.post('/payment-methods', wrap(stripeController.savePaymentMethod.bind(stripeController)));
router.delete('/payment-methods/:id', wrap(stripeController.deletePaymentMethod.bind(stripeController)));
router.put('/payment-methods/:id/default', wrap(stripeController.setDefaultPaymentMethod.bind(stripeController)));

// Bidding (secure - uses authenticated user ID only)
router.get('/bid-power', wrap(stripeController.getBidPower.bind(stripeController)));
router.post('/bids', wrap(stripeController.placeBid.bind(stripeController)));

export default router;
