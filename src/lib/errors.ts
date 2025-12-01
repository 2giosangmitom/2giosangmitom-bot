export class AppError extends Error {
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      isOperational?: boolean;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = this.constructor.name;
    this.isOperational = options?.isOperational ?? true;
    this.context = options?.context;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, { isOperational: true, context });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, unknown>) {
    super(`${resource} not found`, { isOperational: true, context });
  }
}

export class ExternalServiceError extends AppError {
  public readonly service: string;
  public readonly statusCode?: number;

  constructor(
    service: string,
    message: string,
    options?: {
      cause?: Error;
      statusCode?: number;
      context?: Record<string, unknown>;
    }
  ) {
    super(`[${service}] ${message}`, {
      cause: options?.cause,
      isOperational: true,
      context: options?.context
    });
    this.service = service;
    this.statusCode = options?.statusCode;
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(message, { isOperational: false });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
