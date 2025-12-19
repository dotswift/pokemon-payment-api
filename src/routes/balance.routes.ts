import { Router } from 'express';
import { balanceController } from '../controllers/balance.controller';

const router = Router();

/**
 * GET /balance
 * Get balance for all currencies or a specific currency
 * Query params: currency (optional)
 */
router.get('/', balanceController.getBalance.bind(balanceController));

export default router;
