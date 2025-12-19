import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { UnauthorizedError } from '../utils/errors';

const API_KEY_HEADER = 'X-API-Key';

export function apiKeyAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const apiKey = req.header(API_KEY_HEADER);

    if (!apiKey) {
      throw new UnauthorizedError(
        'API key is required. Provide it via X-API-Key header.',
        'MISSING_API_KEY'
      );
    }

    if (apiKey !== config.security.apiKey) {
      throw new UnauthorizedError('Invalid API key', 'INVALID_API_KEY');
    }

    next();
  } catch (error) {
    next(error);
  }
}
