import { Request, Response, NextFunction } from 'express';
import { ordersService } from '../services/transfi/orders';
import { ordersRepository } from '../services/supabase';

export class OrdersController {
  async createPayin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ordersService.createPayin(req.body);

      // Persist to Supabase (non-blocking)
      ordersRepository.create({
        transfi_order_id: result.orderId,
        order_type: 'payin',
        status: 'pending',
        deposit_amount: req.body.amount,
        deposit_currency: req.body.currency,
        payment_code: req.body.paymentCode,
        payment_url: result.paymentUrl,
        metadata: { email: req.body.email },
      }).catch(() => {});

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createPayinWithWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ordersService.createPayinWithWallet(req.body);

      // Persist to Supabase (non-blocking)
      ordersRepository.create({
        transfi_order_id: result.orderId,
        order_type: 'payin',
        status: 'pending',
        deposit_currency: req.body.currency,
        payment_code: req.body.paymentCode,
        payment_url: result.paymentUrl,
        metadata: { email: req.body.email, isWallet: true },
      }).catch(() => {});

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getOrderDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const result = await ordersService.getOrderDetails(orderId);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const ordersController = new OrdersController();
