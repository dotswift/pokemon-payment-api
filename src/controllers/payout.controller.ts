import { Request, Response, NextFunction } from 'express';
import { payoutService } from '../services/transfi/payout';
import { contactsRepository, ordersRepository } from '../services/supabase';

export class PayoutController {
  async createContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await payoutService.createContact(req.body);

      // Persist to Supabase (non-blocking)
      contactsRepository.create({
        transfi_recipient_id: result.recipientId,
        contact_type: req.body.type,
        email: req.body.email,
        first_name: req.body.firstName,
        last_name: req.body.lastName,
        business_name: req.body.businessName,
        country: req.body.country,
      }).catch(() => {});

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

      // Soft delete in Supabase (non-blocking)
      contactsRepository.softDelete(email).catch(() => {});

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async createPayout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await payoutService.createPayout(req.body);

      // Persist to Supabase (non-blocking)
      ordersRepository.create({
        transfi_order_id: result.orderId,
        order_type: 'payout',
        status: 'pending',
        withdraw_amount: req.body.amount,
        withdraw_currency: req.body.currency,
        payment_code: req.body.paymentCode,
        metadata: { email: req.body.email },
      }).catch(() => {});

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const payoutController = new PayoutController();
