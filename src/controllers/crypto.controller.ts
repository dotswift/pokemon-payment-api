import { Request, Response, NextFunction } from 'express';
import { cryptoService } from '../services/transfi/crypto';

export class CryptoController {
  async createPayin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await cryptoService.createPayin(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createPayout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await cryptoService.createPayout(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const cryptoController = new CryptoController();
