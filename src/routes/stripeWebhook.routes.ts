import { Router } from 'express';
import { stripeController } from '../controllers/stripe.controller';

const router = Router();

// Stripe webhook - no auth (uses signature verification)
router.post('/stripe', stripeController.handleWebhook.bind(stripeController));

export default router;
