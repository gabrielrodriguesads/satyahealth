/**
 * Error Handler Middleware
 * Centralized error handling with standardized responses
 */
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ApiErrorResponse } from '../types';

// Custom error class
export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: string;
  
  constructor(statusCode: number, code: string, message: string, details?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'ApiError';
  }
}

// Common errors
export const Errors = {
  notFound: (resource: string) => new ApiError(404, 'NOT_FOUND', `${resource} não encontrado`),
  badRequest: (message: string) => new ApiError(400, 'BAD_REQUEST', message),
  invalidParameter: (param: string) => new ApiError(400, 'INVALID_PARAMETER', `Parâmetro inválido: ${param}`),
  databaseError: (details?: string) => new ApiError(500, 'DATABASE_ERROR', 'Erro no banco de dados', details),
  internalError: (details?: string) => new ApiError(500, 'INTERNAL_ERROR', 'Erro interno do servidor', details),
  serviceUnavailable: () => new ApiError(503, 'SERVICE_UNAVAILABLE', 'Serviço temporariamente indisponível'),
};

/**
 * Error handler middleware
 */
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.requestId || 'unknown';
  
  // Determine error details
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Erro interno do servidor';
  let details: string | undefined;
  
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === 'SyntaxError') {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'JSON inválido no corpo da requisição';
  } else {
    // Log unexpected errors
    logger.error('Unexpected error', {
      requestId,
      error: err.message,
      stack: err.stack,
    });
  }
  
  // Build response
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
    requestId,
    timestamp: new Date().toISOString(),
  };
  
  res.status(statusCode).json(response);
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
    },
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  };
  
  res.status(404).json(response);
}

export default errorHandler;
