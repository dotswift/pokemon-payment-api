import { Router } from 'express';
import { cronController } from '../controllers/cron.controller';

const router = Router();

// No standard auth - uses CRON_API_KEY header
router.post('/auto-release', cronController.processAutoReleases.bind(cronController));

export default router;
