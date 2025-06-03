import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger'; // We'll create this next

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.message, { 
    stack: err.stack, 
    path: req.path, 
    method: req.method,
    body: req.body, // Be careful logging full body in production
    params: req.params,
    query: req.query
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }), // Only show stack in dev
  });
};