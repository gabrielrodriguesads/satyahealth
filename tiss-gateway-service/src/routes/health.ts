/**
 * Health Check Route
 */
import { Router, Request, Response } from 'express';
import { isPoolConnected, getPoolStatistics } from '../db/oraclePool';
import { getMetadataCacheStatus } from '../services/viewMetadataService';
import { HealthStatus } from '../types';

const router = Router();

const startTime = Date.now();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Verifica status da API e conexões
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API saudável
 *       503:
 *         description: API com problemas
 */
router.get('/', (req: Request, res: Response) => {
  const dbConnected = isPoolConnected();
  const poolStats = getPoolStatistics();
  const viewsStatus = getMetadataCacheStatus();
  
  const status: HealthStatus = {
    status: dbConnected ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    database: {
      connected: dbConnected,
      poolSize: poolStats?.poolMax,
      activeConnections: poolStats?.connectionsInUse,
    },
    views: viewsStatus,
  };
  
  const statusCode = dbConnected ? 200 : 503;
  res.status(statusCode).json(status);
});

export default router;
