import { transfiClient } from './client';
import {
  CreatePayinRequest,
  CreatePayinResponse,
  CreatePayinWithWalletRequest,
  CreatePayinWithWalletResponse,
  GetOrderDetailsResponse,
} from '../../types/transfi';

export class OrdersService {
  /**
   * Create a payin order (fiat deposit)
   */
  async createPayin(data: CreatePayinRequest): Promise<CreatePayinResponse> {
    return transfiClient.post<CreatePayinResponse>('/v2/orders/deposit', data);
  }

  /**
   * Create a payin order with wallet (gaming)
   */
  async createPayinWithWallet(data: CreatePayinWithWalletRequest): Promise<CreatePayinWithWalletResponse> {
    return transfiClient.post<CreatePayinWithWalletResponse>('/v2/orders/deposit', data);
  }

  /**
   * Get order details by order ID
   */
  async getOrderDetails(orderId: string): Promise<GetOrderDetailsResponse> {
    return transfiClient.get<GetOrderDetailsResponse>(`/v2/orders/${orderId}`);
  }
}

export const ordersService = new OrdersService();
