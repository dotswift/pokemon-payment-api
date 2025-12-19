import { transfiClient } from './client';
import {
  CreateIndividualRequest,
  CreateIndividualResponse,
  ListIndividualsRequest,
  ListIndividualsResponse,
  CreateBusinessRequest,
  CreateBusinessResponse,
  ListBusinessRequest,
  ListBusinessResponse,
} from '../../types/transfi';

export class UsersService {
  /**
   * Create an individual user
   */
  async createIndividual(data: CreateIndividualRequest): Promise<CreateIndividualResponse> {
    return transfiClient.post<CreateIndividualResponse>('/v2/users/individual', data);
  }

  /**
   * List individual users
   */
  async listIndividuals(params?: ListIndividualsRequest): Promise<ListIndividualsResponse> {
    return transfiClient.get<ListIndividualsResponse>('/v2/users/individuals', {
      params: {
        email: params?.email,
        userId: params?.userId,
        page: params?.page,
        limit: params?.limit,
      },
    });
  }

  /**
   * Create a business user
   */
  async createBusiness(data: CreateBusinessRequest): Promise<CreateBusinessResponse> {
    return transfiClient.post<CreateBusinessResponse>('/v2/users/business', data);
  }

  /**
   * List business users
   */
  async listBusiness(params?: ListBusinessRequest): Promise<ListBusinessResponse> {
    return transfiClient.get<ListBusinessResponse>('/v2/users/business', {
      params: {
        email: params?.email,
        userId: params?.userId,
        page: params?.page,
        limit: params?.limit,
      },
    });
  }
}

export const usersService = new UsersService();
