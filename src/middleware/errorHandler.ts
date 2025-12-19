import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    errors?: Record<string, string[]>;
  };
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle known operational errors
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };

    // Include validation errors if present
    if (err instanceof ValidationError) {
      response.error.errors = err.errors;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle unexpected errors
  const statusCode = 500;
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
  };

  res.status(statusCode).json(response);
}
