/**
 * Request Logger Middleware
 * Logs incoming requests and response times
 */
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const { method, originalUrl, requestId } = req;
  
  // Log request
  logger.info(`Incoming request`, {
    requestId,
    method,
    url: originalUrl,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });
  
  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    const { statusCode } = res;
    
    const logLevel = statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel](`Request completed`, {
      requestId,
      method,
      url: originalUrl,
      statusCode,
      duration: `${duration}ms`,
    });
  });
  
  next();
}

export default requestLoggerMiddleware;
