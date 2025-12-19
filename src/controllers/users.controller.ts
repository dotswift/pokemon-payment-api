import { Request, Response, NextFunction } from 'express';
import { usersService } from '../services/transfi/users';

export class UsersController {
  async createIndividual(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.createIndividual(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listIndividuals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, userId, page, limit } = req.query;
      const result = await usersService.listIndividuals({
        email: email as string | undefined,
        userId: userId as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async createBusiness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.createBusiness(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listBusiness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, userId, page, limit } = req.query;
      const result = await usersService.listBusiness({
        email: email as string | undefined,
        userId: userId as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();
