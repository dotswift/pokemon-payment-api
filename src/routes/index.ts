import { Router } from 'express';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import configRoutes from './config.routes';
import exchangeRatesRoutes from './exchangeRates.routes';
import balanceRoutes from './balance.routes';
import usersRoutes from './users.routes';
import kycRoutes from './kyc.routes';

const router = Router();

// All routes require API key authentication
router.use(apiKeyAuth);

// Mount routes
router.use('/config', configRoutes);
router.use('/exchange-rates', exchangeRatesRoutes);
router.use('/balance', balanceRoutes);
router.use('/users', usersRoutes);
router.use('/kyc', kycRoutes);

export default router;
