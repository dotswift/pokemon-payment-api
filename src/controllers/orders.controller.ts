import { Request, Response, NextFunction } from 'express';
import { ordersService } from '../services/transfi/orders';

export class OrdersController {
  async createPayin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ordersService.createPayin(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createPayinWithWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ordersService.createPayinWithWallet(req.body);
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
