import { Router } from 'express';
import { exchangeRatesController } from '../controllers/exchangeRates.controller';

const router = Router();

/**
 * GET /exchange-rates/live
 * Get live deposit/withdraw rates
 * Query params: currency
 */
router.get('/live', exchangeRatesController.getLiveRates.bind(exchangeRatesController));

/**
 * GET /exchange-rates/onramp
 * Get fiat to crypto quote
 * Query params: fiatTicker, amount, cryptoTicker, paymentCode, direction
 */
router.get('/onramp', exchangeRatesController.getOnrampQuote.bind(exchangeRatesController));

/**
 * GET /exchange-rates/offramp
 * Get crypto to fiat quote
 * Query params: fiatTicker, amount, cryptoTicker, baseTicker, direction, paymentCode
 */
router.get('/offramp', exchangeRatesController.getOfframpQuote.bind(exchangeRatesController));

/**
 * GET /exchange-rates/payin
 * Get payin quote (fiat to stablecoin)
 * Query params: amount, currency, paymentCode, direction, balanceCurrency
 */
router.get('/payin', exchangeRatesController.getPayinQuote.bind(exchangeRatesController));

/**
 * GET /exchange-rates/payout
 * Get payout quote (stablecoin to fiat)
 * Query params: amount, currency, paymentCode, direction, balanceCurrency
 */
router.get('/payout', exchangeRatesController.getPayoutQuote.bind(exchangeRatesController));

export default router;
