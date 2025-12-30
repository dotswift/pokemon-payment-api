import { Router } from 'express';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import configRoutes from './config.routes';
import exchangeRatesRoutes from './exchangeRates.routes';
import balanceRoutes from './balance.routes';
import usersRoutes from './users.routes';
import kycRoutes from './kyc.routes';
import ordersRoutes from './orders.routes';
import payoutRoutes from './payout.routes';
import cryptoRoutes from './crypto.routes';
import prefundsRoutes from './prefunds.routes';
import sandboxRoutes from './sandbox.routes';
import stripeRoutes from './stripe.routes';
import connectRoutes from './connect.routes';
import sellerRoutes from './seller.routes';
import settlementRoutes from './settlement.routes';
import purchasesRoutes from './purchases.routes';

const router = Router();

// Stripe routes use Supabase JWT auth (not API key)
router.use('/stripe', stripeRoutes);

// Connect routes use Supabase JWT auth (seller onboarding)
router.use('/connect', connectRoutes);

// Seller routes use Supabase JWT auth
router.use('/seller', sellerRoutes);

// Settlement routes use Supabase JWT auth (delivery confirmation)
router.use('/settlements', settlementRoutes);

// Purchases routes use Supabase JWT auth (buyer's won auctions)
router.use('/purchases', purchasesRoutes);

// All other routes require API key authentication
router.use(apiKeyAuth);

// Mount routes
router.use('/config', configRoutes);
router.use('/exchange-rates', exchangeRatesRoutes);
router.use('/balance', balanceRoutes);
router.use('/users', usersRoutes);
router.use('/kyc', kycRoutes);
router.use('/orders', ordersRoutes);
router.use('/payout', payoutRoutes);
router.use('/crypto', cryptoRoutes);
router.use('/prefunds', prefundsRoutes);
router.use('/sandbox', sandboxRoutes);

export default router;
