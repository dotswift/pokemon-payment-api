export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', code: string = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', code: string = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not found', code: string = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', code: string = 'CONFLICT') {
    super(message, 409, code);
  }
}

export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(message: string = 'Validation failed', errors: Record<string, string[]> = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class TransFiError extends AppError {
  public readonly transfiCode: string;

  constructor(message: string, transfiCode: string, statusCode: number = 502) {
    super(message, statusCode, 'TRANSFI_ERROR');
    this.transfiCode = transfiCode;
  }
}
