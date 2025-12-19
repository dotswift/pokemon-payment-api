import { config } from './index';

export const transfiConfig = {
  baseUrl: config.transfi.baseUrl,
  username: config.transfi.username,
  password: config.transfi.password,
  mid: config.transfi.mid,

  getAuthHeader(): string {
    return Buffer.from(`${this.username}:${this.password}`).toString('base64');
  },

  isSandbox(): boolean {
    return this.baseUrl.includes('sandbox');
  },
};
