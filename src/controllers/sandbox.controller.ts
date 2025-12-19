import { Request, Response, NextFunction } from 'express';
import { sandboxService } from '../services/transfi/sandbox';

export class SandboxController {
  async createPrefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await sandboxService.createPrefund(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const sandboxController = new SandboxController();
