/**
 * TISS Gateway Service - Main Entry Point
 */
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';

import config from './config';
import { swaggerSpec } from './config/swagger';
import { initializePool, closePool } from './db/oraclePool';
import { initializeViewMetadata } from './services/viewMetadataService';
import logger from './utils/logger';

// Middlewares
import requestIdMiddleware from './middlewares/requestId';
import requestLoggerMiddleware from './middlewares/requestLogger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

// Routes
import healthRouter from './routes/health';
import guiasRouter from './routes/guias';
import contasRouter from './routes/contas';
import prestadoresRouter from './routes/prestadores';

const app: Express = express();

// Security middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Disable for Swagger UI
}) as any);
app.use(cors() as any);
app.use(compression() as any);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Custom middlewares
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

// Swagger documentation
app.use('/docs', swaggerUi.serve as any, swaggerUi.setup(swaggerSpec) as any);

// API Routes
app.use('/health', healthRouter);
app.use(`${config.api.prefix}/guias`, guiasRouter);
app.use(`${config.api.prefix}/contas`, contasRouter);
app.use(`${config.api.prefix}/prestadores`, prestadoresRouter);

// Root redirect to docs
app.get('/', (req, res) => {
  res.redirect('/docs');
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    logger.info('Starting TISS Gateway Service...');
    
    // Initialize Oracle connection pool
    await initializePool();
    
    // Initialize view metadata
    await initializeViewMetadata();
    
    // Start HTTP server
    const server = app.listen(config.api.port, () => {
      logger.info(`Server running on port ${config.api.port}`);
      logger.info(`Swagger docs available at http://localhost:${config.api.port}/docs`);
      logger.info(`Health check at http://localhost:${config.api.port}/health`);
    });
    
    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await closePool();
          logger.info('Database connections closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
