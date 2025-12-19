import { transfiClient } from './client';
import {
  LiveRatesRequest,
  LiveRatesResponse,
  OnrampQuoteRequest,
  OnrampQuoteResponse,
  OfframpQuoteRequest,
  OfframpQuoteResponse,
  PayinQuoteRequest,
  PayinQuoteResponse,
  PayoutQuoteRequest,
  PayoutQuoteResponse,
  GamingRatesRequest,
  GamingRatesResponse,
} from '../../types/transfi';

export class ExchangeRatesService {
  /**
   * Get live deposit/withdraw rates for a currency
   */
  async getLiveRates(params: LiveRatesRequest): Promise<LiveRatesResponse> {
    return transfiClient.get<LiveRatesResponse>('/v2/exchange-rates/live-rates', {
      params: { currency: params.currency },
    });
  }

  /**
   * Get onramp quote (fiat to crypto)
   */
  async getOnrampQuote(params: OnrampQuoteRequest): Promise<OnrampQuoteResponse> {
    return transfiClient.get<OnrampQuoteResponse>('/v2/exchange-rates/fiat-to-crypto', {
      params: {
        fiatTicker: params.fiatTicker,
        amount: params.amount,
        cryptoTicker: params.cryptoTicker,
        paymentCode: params.paymentCode,
        direction: params.direction ?? 'forward',
      },
    });
  }

  /**
   * Get offramp quote (crypto to fiat)
   */
  async getOfframpQuote(params: OfframpQuoteRequest): Promise<OfframpQuoteResponse> {
    return transfiClient.get<OfframpQuoteResponse>('/v2/exchange-rates/crypto-to-fiat', {
      params: {
        fiatTicker: params.fiatTicker,
        amount: params.amount,
        cryptoTicker: params.cryptoTicker,
        baseTicker: params.baseTicker,
        direction: params.direction ?? 'forward',
        paymentCode: params.paymentCode,
      },
    });
  }

  /**
   * Get payin quote (fiat to stablecoin)
   */
  async getPayinQuote(params: PayinQuoteRequest): Promise<PayinQuoteResponse> {
    return transfiClient.get<PayinQuoteResponse>('/v2/exchange-rates/deposit', {
      params: {
        amount: params.amount,
        currency: params.currency,
        paymentCode: params.paymentCode,
        direction: params.direction ?? 'forward',
        balanceCurrency: params.balanceCurrency,
      },
    });
  }

  /**
   * Get payout quote (stablecoin to fiat)
   */
  async getPayoutQuote(params: PayoutQuoteRequest): Promise<PayoutQuoteResponse> {
    return transfiClient.get<PayoutQuoteResponse>('/v2/exchange-rates/withdraw', {
      params: {
        amount: params.amount,
        currency: params.currency,
        paymentCode: params.paymentCode,
        direction: params.direction ?? 'forward',
        balanceCurrency: params.balanceCurrency,
      },
    });
  }

  /**
   * Get gaming rates
   */
  async getGamingRates(params: GamingRatesRequest): Promise<GamingRatesResponse> {
    return transfiClient.get<GamingRatesResponse>('/v2/exchange-rates/gaming', {
      params: {
        amount: params.amount,
        currency: params.currency,
        paymentCode: params.paymentCode,
        direction: params.direction ?? 'forward',
      },
    });
  }
}

export const exchangeRatesService = new ExchangeRatesService();
