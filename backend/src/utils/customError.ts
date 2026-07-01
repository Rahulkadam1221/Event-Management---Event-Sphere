export class CustomError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode: number = 500,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'CustomError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, errors?: Record<string, string[]>) {
    return new CustomError(message, 400, errors);
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new CustomError(message, 401);
  }

  static forbidden(message: string = 'Forbidden') {
    return new CustomError(message, 403);
  }

  static notFound(message: string = 'Resource not found') {
    return new CustomError(message, 404);
  }

  static conflict(message: string) {
    return new CustomError(message, 409);
  }

  static internal(message: string = 'Internal server error') {
    return new CustomError(message, 500);
  }
}
