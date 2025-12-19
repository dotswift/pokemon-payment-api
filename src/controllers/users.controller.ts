import { Request, Response, NextFunction } from 'express';
import { usersService } from '../services/transfi/users';
import { usersRepository } from '../services/supabase';

export class UsersController {
  async createIndividual(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.createIndividual(req.body);

      // Persist to Supabase (non-blocking)
      usersRepository.create({
        transfi_user_id: result.userId,
        user_type: 'individual',
        email: req.body.email,
        first_name: req.body.firstName,
        last_name: req.body.lastName,
        country: req.body.country,
        phone: req.body.phone,
        status: 'active',
      }).catch(() => {});

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

      // Persist to Supabase (non-blocking)
      usersRepository.create({
        transfi_user_id: result.userId,
        user_type: 'business',
        email: req.body.email,
        business_name: req.body.businessName,
        country: req.body.country,
        phone: req.body.phone,
        status: 'active',
      }).catch(() => {});

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
