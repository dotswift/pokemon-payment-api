import { Router, Request, Response, NextFunction } from 'express';
import { settlementController } from '../controllers/settlement.controller';
import { supabaseAuth, AuthenticatedRequest } from '../middleware/supabaseAuth';

const router = Router();

// Helper to wrap authenticated handlers
const wrap = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthenticatedRequest, res, next);

// All routes require Supabase JWT auth
router.use(supabaseAuth);

// Get buyer's purchases (won auctions)
router.get('/', wrap(settlementController.getPurchases.bind(settlementController)));

export default router;
