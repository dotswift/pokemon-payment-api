import { Router } from 'express';
import { configController } from '../controllers/config.controller';

const router = Router();

/**
 * GET /config/currencies
 * List supported currencies
 * Query params: direction (deposit|withdraw), page, limit
 */
router.get('/currencies', configController.listCurrencies.bind(configController));

/**
 * GET /config/payment-methods
 * List payment methods for a currency
 * Query params: currency, direction, page, limit, headlessMode, userType
 */
router.get('/payment-methods', configController.listPaymentMethods.bind(configController));

/**
 * GET /config/tokens
 * List supported tokens
 * Query params: direction, page, limit
 */
router.get('/tokens', configController.listTokens.bind(configController));

export default router;
