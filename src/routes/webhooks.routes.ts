import { Router } from 'express';
import { webhooksController } from '../controllers/webhooks.controller';

const router = Router();

// No API key auth - webhooks use signature verification
router.post('/transfi', webhooksController.handleTransfiWebhook);

export default router;
