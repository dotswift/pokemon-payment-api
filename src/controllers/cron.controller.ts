import { Request, Response, NextFunction } from 'express';
import { payoutService } from '../services/stripe/payout.service';
import { logger } from '../utils/logger';

const CRON_API_KEY = process.env.CRON_API_KEY;

class CronController {
  /**
   * POST /api/v1/cron/auto-release
   * Process automatic escrow releases for delivered packages
   * Called by Heroku Scheduler or similar cron service
   */
  async processAutoReleases(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Verify cron API key
      const apiKey = req.headers['x-cron-api-key'];
      if (!CRON_API_KEY || apiKey !== CRON_API_KEY) {
        logger.warn('Invalid cron API key');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await payoutService.processAutoReleases();

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Cron auto-release job failed', { error });
      next(error);
    }
  }
}

export const cronController = new CronController();
