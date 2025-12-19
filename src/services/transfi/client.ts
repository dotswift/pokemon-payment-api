import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { transfiConfig } from '../../config/transfi';
import { logger } from '../../utils/logger';
import { TransFiError } from '../../utils/errors';

interface TransFiErrorResponse {
  code: string;
  message: string;
}

export class TransFiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: transfiConfig.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - add auth headers
    this.client.interceptors.request.use(
      (config) => {
        config.headers.Authorization = `Basic ${transfiConfig.getAuthHeader()}`;
        config.headers.MID = transfiConfig.mid;

        logger.debug('TransFi Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params,
        });

        return config;
      },
      (error) => {
        logger.error('TransFi Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('TransFi Response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error: AxiosError<TransFiErrorResponse>) => {
        const status = error.response?.status ?? 500;
        const data = error.response?.data;

        logger.error('TransFi API Error', {
          status,
          url: error.config?.url,
          code: data?.code,
          message: data?.message ?? error.message,
        });

        // Transform to our error format
        throw new TransFiError(
          data?.message ?? error.message ?? 'TransFi API error',
          data?.code ?? 'TRANSFI_ERROR',
          status >= 500 ? 502 : status
        );
      }
    );
  }

  async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(path, config);
    return response.data;
  }

  async post<T>(
    path: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<T>(path, data, config);
    return response.data;
  }

  async put<T>(
    path: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.put<T>(path, data, config);
    return response.data;
  }

  async delete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(path, config);
    return response.data;
  }

  // For multipart/form-data uploads (KYC documents)
  async postFormData<T>(
    path: string,
    formData: FormData,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<T>(path, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

// Singleton instance
export const transfiClient = new TransFiClient();
