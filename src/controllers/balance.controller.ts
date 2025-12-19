import { Request, Response, NextFunction } from 'express';
import { balanceService } from '../services/transfi/balance';

export class BalanceController {
  async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currency = req.query.currency as string | undefined;
      const result = await balanceService.getBalance({ currency });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const balanceController = new BalanceController();
