import { Router, Request, Response, NextFunction } from 'express';
import { profileController } from '../controllers/profile.controller';
import { supabaseAuth, AuthenticatedRequest } from '../middleware/supabaseAuth';

const router = Router();

// Helper to wrap authenticated handlers
const wrap = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthenticatedRequest, res, next);

// All routes require Supabase JWT auth
router.use(supabaseAuth);

// Shipping address endpoints
router.get('/shipping-address', wrap(profileController.getShippingAddress.bind(profileController)));
router.put('/shipping-address', wrap(profileController.saveShippingAddress.bind(profileController)));
router.get('/has-shipping-address', wrap(profileController.hasShippingAddress.bind(profileController)));

export default router;
