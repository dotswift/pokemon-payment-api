import { transfiClient } from './client';
import {
  ListCurrenciesRequest,
  ListCurrenciesResponse,
  ListPaymentMethodsRequest,
  ListPaymentMethodsResponse,
  ListTokensRequest,
  ListTokensResponse,
} from '../../types/transfi';

export class ConfigService {
  /**
   * List supported currencies
   */
  async listCurrencies(params: ListCurrenciesRequest): Promise<ListCurrenciesResponse> {
    return transfiClient.get<ListCurrenciesResponse>('/v2/supported-currencies', {
      params: {
        direction: params.direction,
        page: params.page,
        limit: params.limit,
      },
    });
  }

  /**
   * List payment methods for a currency
   */
  async listPaymentMethods(params: ListPaymentMethodsRequest): Promise<ListPaymentMethodsResponse> {
    return transfiClient.get<ListPaymentMethodsResponse>('/v2/payment-methods', {
      params: {
        currency: params.currency,
        direction: params.direction,
        page: params.page,
        limit: params.limit,
        headlessMode: params.headlessMode,
        userType: params.userType,
      },
    });
  }

  /**
   * List supported tokens
   */
  async listTokens(params?: ListTokensRequest): Promise<ListTokensResponse> {
    return transfiClient.get<ListTokensResponse>('/v2/config/list-tokens', {
      params: {
        direction: params?.direction,
        page: params?.page,
        limit: params?.limit,
      },
    });
  }
}

export const configService = new ConfigService();
