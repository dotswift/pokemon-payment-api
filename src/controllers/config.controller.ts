import { Request, Response, NextFunction } from 'express';
import { configService } from '../services/transfi/config';
import { PaymentDirection, UserType } from '../types/transfi';

export class ConfigController {
  async listCurrencies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const direction = req.query.direction as PaymentDirection;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const result = await configService.listCurrencies({ direction, page, limit });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async listPaymentMethods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currency = req.query.currency as string;
      const direction = req.query.direction as PaymentDirection;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const headlessMode = req.query.headlessMode === 'true';
      const userType = req.query.userType as UserType | undefined;

      const result = await configService.listPaymentMethods({
        currency,
        direction,
        page,
        limit,
        headlessMode,
        userType,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async listTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const direction = req.query.direction as PaymentDirection | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const result = await configService.listTokens({ direction, page, limit });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const configController = new ConfigController();
