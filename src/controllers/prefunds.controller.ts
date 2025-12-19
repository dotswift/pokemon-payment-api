import { Request, Response, NextFunction } from 'express';
import { prefundsService } from '../services/transfi/prefunds';

export class PrefundsController {
  async getWalletAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await prefundsService.getWalletAddress(req.query as { cryptoTicker: string });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createPrefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await prefundsService.createPrefund(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const prefundsController = new PrefundsController();
