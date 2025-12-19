import { Router } from 'express';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import configRoutes from './config.routes';
import exchangeRatesRoutes from './exchangeRates.routes';
import balanceRoutes from './balance.routes';

const router = Router();

// All routes require API key authentication
router.use(apiKeyAuth);

// Mount routes
router.use('/config', configRoutes);
router.use('/exchange-rates', exchangeRatesRoutes);
router.use('/balance', balanceRoutes);

export default router;
