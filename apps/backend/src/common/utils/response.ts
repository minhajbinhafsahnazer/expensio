/**
 * Standard API response envelope builders.
 *
 * All API responses follow this shape:
 * {
 *   success: boolean
 *   message: string
 *   data: T | {}
 *   meta: { requestId: string; timestamp: string }
 * }
 *
 * The preSerialization hook in app.ts wraps plain objects automatically,
 * but controllers that need custom messages call these helpers explicitly.
 */

export interface ApiMeta {
  requestId: string;
  timestamp: string;
}

export interface SuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  meta: ApiMeta;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    fields?: Record<string, string>;
  };
  meta: ApiMeta;
}

export function successResponse<T>(
  data: T,
  message: string,
  requestId: string,
): SuccessResponse<T> {
  return {
    success: true,
    message,
    data,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
}

export function errorResponse(
  code: string,
  message: string,
  requestId: string,
  fields?: Record<string, string>,
): ErrorResponse {
  return {
    success: false,
    message,
    error: { code, ...(fields ? { fields } : {}) },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
}
