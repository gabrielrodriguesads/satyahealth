/**
 * Request ID Middleware
 * Assigns unique request ID for tracing
 */
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Use existing request ID from header or generate new one
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  
  req.requestId = requestId;
  req.startTime = Date.now();
  
  // Add to response headers
  res.setHeader('X-Request-ID', requestId);
  
  next();
}

export default requestIdMiddleware;
