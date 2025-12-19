import { Request, Response, NextFunction } from 'express';
import { kycService } from '../services/transfi/kyc';

export class KYCController {
  async shareWithToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await kycService.shareWithToken(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async submitKYC(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await kycService.submitKYC(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async submitAdvancedKYC(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await kycService.submitAdvancedKYC(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const email = req.query.email as string;
      const result = await kycService.getStatus({ email });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const kycController = new KYCController();
