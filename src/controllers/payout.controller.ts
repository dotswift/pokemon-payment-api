import { Request, Response, NextFunction } from 'express';
import { payoutService } from '../services/transfi/payout';

export class PayoutController {
  async createContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await payoutService.createContact(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const email = req.params.email as string;
      const result = await payoutService.getContact(email);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const email = req.params.email as string;
      const result = await payoutService.deleteContact(email);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async createPayout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await payoutService.createPayout(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const payoutController = new PayoutController();
