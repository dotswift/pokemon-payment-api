import { Request, Response, NextFunction } from 'express';
import { exchangeRatesService } from '../services/transfi/exchangeRates';
import { Direction } from '../types/transfi';

export class ExchangeRatesController {
  async getLiveRates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currency = req.query.currency as string;
      const result = await exchangeRatesService.getLiveRates({ currency });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getOnrampQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const fiatTicker = req.query.fiatTicker as string;
      const amount = parseFloat(req.query.amount as string);
      const cryptoTicker = req.query.cryptoTicker as string;
      const paymentCode = req.query.paymentCode as string;
      const direction = (req.query.direction as Direction) ?? 'forward';

      const result = await exchangeRatesService.getOnrampQuote({
        fiatTicker,
        amount,
        cryptoTicker,
        paymentCode,
        direction,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getOfframpQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const fiatTicker = req.query.fiatTicker as string;
      const amount = parseFloat(req.query.amount as string);
      const cryptoTicker = req.query.cryptoTicker as string;
      const baseTicker = req.query.baseTicker as 'fiat' | 'crypto';
      const direction = (req.query.direction as Direction) ?? 'forward';
      const paymentCode = req.query.paymentCode as string | undefined;

      const result = await exchangeRatesService.getOfframpQuote({
        fiatTicker,
        amount,
        cryptoTicker,
        baseTicker,
        direction,
        paymentCode,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getPayinQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const amount = parseFloat(req.query.amount as string);
      const currency = req.query.currency as string;
      const paymentCode = req.query.paymentCode as string | undefined;
      const direction = (req.query.direction as Direction) ?? 'forward';
      const balanceCurrency = req.query.balanceCurrency as string | undefined;

      const result = await exchangeRatesService.getPayinQuote({
        amount,
        currency,
        paymentCode,
        direction,
        balanceCurrency,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getPayoutQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const amount = parseFloat(req.query.amount as string);
      const currency = req.query.currency as string;
      const paymentCode = req.query.paymentCode as string | undefined;
      const direction = (req.query.direction as Direction) ?? 'forward';
      const balanceCurrency = req.query.balanceCurrency as string | undefined;

      const result = await exchangeRatesService.getPayoutQuote({
        amount,
        currency,
        paymentCode,
        direction,
        balanceCurrency,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const exchangeRatesController = new ExchangeRatesController();
