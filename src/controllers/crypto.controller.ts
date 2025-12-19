import { Request, Response, NextFunction } from 'express';
import { cryptoService } from '../services/transfi/crypto';
import { ordersRepository } from '../services/supabase';

export class CryptoController {
  async createPayin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await cryptoService.createPayin(req.body);

      // Persist to Supabase (non-blocking)
      ordersRepository.create({
        transfi_order_id: result.orderId,
        order_type: 'crypto_payin',
        status: 'pending',
        deposit_amount: req.body.amount,
        deposit_currency: req.body.cryptoTicker,
        wallet_address: result.walletAddress,
        metadata: { email: req.body.email },
      }).catch(() => {});

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createPayout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await cryptoService.createPayout(req.body);

      // Persist to Supabase (non-blocking)
      ordersRepository.create({
        transfi_order_id: result.orderId,
        order_type: 'crypto_payout',
        status: 'pending',
        withdraw_amount: req.body.amount,
        withdraw_currency: req.body.cryptoTicker,
        wallet_address: req.body.walletAddress,
        metadata: { email: req.body.email },
      }).catch(() => {});

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const cryptoController = new CryptoController();
