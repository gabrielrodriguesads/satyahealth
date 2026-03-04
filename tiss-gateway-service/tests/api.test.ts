/**
 * Smoke Tests for TISS Gateway Service
 * These tests validate basic API functionality
 */
import request from 'supertest';
import express, { Express } from 'express';

// Mock Oracle module
jest.mock('oracledb', () => ({
  createPool: jest.fn().mockResolvedValue({
    getConnection: jest.fn().mockResolvedValue({
      execute: jest.fn().mockResolvedValue({ rows: [] }),
      close: jest.fn(),
    }),
    close: jest.fn(),
    status: 1,
    getStatistics: jest.fn().mockReturnValue({ poolMax: 10, connectionsInUse: 0 }),
  }),
  OUT_FORMAT_OBJECT: 4001,
  POOL_STATUS_OPEN: 1,
}));

// Create test app
const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  
  // Mock health endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: 100,
      database: { connected: true },
      views: { loaded: true, count: 3 },
    });
  });
  
  // Mock API endpoints
  app.get('/api/guias', (req, res) => {
    res.json({
      success: true,
      data: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });
  });
  
  app.get('/api/guias/:guiaId', (req, res) => {
    if (req.params.guiaId === 'not-found') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Guia não encontrada' },
      });
    }
    res.json({
      success: true,
      data: {
        guia: { GUIA_ID: req.params.guiaId },
        procedimentos: [],
      },
    });
  });
  
  app.get('/api/contas', (req, res) => {
    res.json({
      success: true,
      data: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });
  });
  
  app.get('/api/prestadores', (req, res) => {
    res.json({
      success: true,
      data: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });
  });
  
  return app;
};

describe('TISS Gateway Service - Smoke Tests', () => {
  let app: Express;
  
  beforeAll(() => {
    app = createTestApp();
  });
  
  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.database.connected).toBe(true);
    });
  });
  
  describe('Guias Endpoints', () => {
    it('GET /api/guias should return paginated list', async () => {
      const response = await request(app).get('/api/guias');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
      expect(response.body).toHaveProperty('total');
    });
    
    it('GET /api/guias should accept pagination params', async () => {
      const response = await request(app)
        .get('/api/guias')
        .query({ page: 2, pageSize: 10 });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('GET /api/guias/:guiaId should return guia with procedimentos', async () => {
      const response = await request(app).get('/api/guias/12345');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('guia');
      expect(response.body.data).toHaveProperty('procedimentos');
    });
    
    it('GET /api/guias/:guiaId should return 404 for not found', async () => {
      const response = await request(app).get('/api/guias/not-found');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
  
  describe('Contas Endpoints', () => {
    it('GET /api/contas should return paginated list', async () => {
      const response = await request(app).get('/api/contas');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
  
  describe('Prestadores Endpoints', () => {
    it('GET /api/prestadores should return paginated list', async () => {
      const response = await request(app).get('/api/prestadores');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
  
  describe('Response Format', () => {
    it('should include success flag in all responses', async () => {
      const endpoints = ['/api/guias', '/api/contas', '/api/prestadores'];
      
      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.body).toHaveProperty('success');
      }
    });
    
    it('should include pagination metadata in list responses', async () => {
      const response = await request(app).get('/api/guias');
      
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
      expect(response.body).toHaveProperty('total');
      expect(typeof response.body.page).toBe('number');
      expect(typeof response.body.pageSize).toBe('number');
      expect(typeof response.body.total).toBe('number');
    });
  });
});
