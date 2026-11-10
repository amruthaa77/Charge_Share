/**
 * Standard Application Error Class with HTTP status code and stable error code
 */
export class APIError extends Error {
  constructor(statusCode, code, message, errors = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }

  static badRequest(message, code = 'BAD_REQUEST', errors = null) {
    return new APIError(400, code, message, errors);
  }

  static validation(errors, message = 'Validation failed') {
    return new APIError(400, 'VALIDATION_ERROR', message, errors);
  }

  static unauthenticated(message = 'Access denied. No authentication token provided.', code = 'UNAUTHENTICATED') {
    return new APIError(401, code, message);
  }

  static forbidden(message = "Forbidden: You don't have permission to access this resource.", code = 'FORBIDDEN') {
    return new APIError(403, code, message);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new APIError(404, code, message);
  }

  static conflict(message, code = 'CONFLICT', errors = null) {
    return new APIError(409, code, message, errors);
  }

  static rateLimited(message = 'Too many requests. Please try again later.', code = 'RATE_LIMITED') {
    return new APIError(429, code, message);
  }

  static internal(message = 'Something went wrong on our side. Please try again', code = 'INTERNAL_SERVER_ERROR') {
    return new APIError(500, code, message);
  }
}
