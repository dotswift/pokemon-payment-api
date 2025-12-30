import { Router, Request, Response, NextFunction } from 'express';
import { connectController } from '../controllers/connect.controller';
import { supabaseAuth, AuthenticatedRequest } from '../middleware/supabaseAuth';

const router = Router();

// Helper to wrap authenticated handlers
const wrap = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthenticatedRequest, res, next);

// All routes require Supabase JWT auth
router.use(supabaseAuth);

// Connect account management
router.post('/account', wrap(connectController.createAccount.bind(connectController)));
router.get('/account', wrap(connectController.getAccount.bind(connectController)));
router.post('/onboarding-link', wrap(connectController.createOnboardingLink.bind(connectController)));
router.get('/dashboard-link', wrap(connectController.getDashboardLink.bind(connectController)));

export default router;
