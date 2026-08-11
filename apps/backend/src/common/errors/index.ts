/**
 * Typed application error classes.
 *
 * All errors extend AppError which carries statusCode and code.
 * The global Fastify error handler in app.ts reads these properties
 * to produce properly structured API error responses.
 *
 * Services throw these. Controllers and routes let them propagate.
 * Never throw raw Error() from service or repository code.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    // Restore prototype chain (required when extending built-ins in TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 401 — Missing token, expired token, invalid credentials, inactive user. */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/** 403 — Authenticated but not permitted for this resource. */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/** 404 — Resource does not exist. */
export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/** 409 — Unique constraint conflict (e.g. email already registered). */
export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}

/** 422 — Business rule violation (e.g. already revoked, session mismatch). */
export class UnprocessableError extends AppError {
  constructor(message = 'Unprocessable') {
    super(message, 422, 'UNPROCESSABLE');
  }
}

/** 429 — Rate limit exceeded (also set by @fastify/rate-limit plugin). */
export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'TOO_MANY_REQUESTS');
  }
}
