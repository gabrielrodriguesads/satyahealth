/**
 * Prestadores Routes
 * Endpoints for VW_TISS_PRESTADORES view
 */
import { Router, Request, Response, NextFunction } from 'express';
import { queryView, queryById } from '../services/viewQueryService';
import { Errors } from '../middlewares/errorHandler';
import config from '../config';
import { ViewQueryParams, ApiResponse, OracleRow } from '../types';

const router = Router();

// View name
const VIEW_NAME = config.views.prestadores;
const PRESTADOR_ID_COLUMN = config.views.prestadorIdColumn;

/**
 * Parse query params for filtering and pagination
 */
function parseQueryParams(query: Request['query']): ViewQueryParams {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string) || 20));
  const sort = query.sort as string | undefined;
  const order = (query.order as string)?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  
  const reservedParams = ['page', 'pageSize', 'sort', 'order'];
  const filters: Record<string, string | number | Date> = {};
  
  for (const [key, value] of Object.entries(query)) {
    if (!reservedParams.includes(key) && value !== undefined && value !== '') {
      filters[key] = value as string;
    }
  }
  
  return { page, pageSize, sort, order, filters };
}

/**
 * @swagger
 * /api/prestadores:
 *   get:
 *     summary: Lista prestadores
 *     description: Retorna lista de prestadores da view VW_TISS_PRESTADORES
 *     tags: [Prestadores]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *       - in: query
 *         name: prestadorId
 *         schema:
 *           type: string
 *       - in: query
 *         name: cnpj
 *         schema:
 *           type: string
 *       - in: query
 *         name: nome
 *         schema:
 *           type: string
 *       - in: query
 *         name: cidade
 *         schema:
 *           type: string
 *       - in: query
 *         name: uf
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de prestadores
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = parseQueryParams(req.query);
    const { data, total } = await queryView(VIEW_NAME, params, req.requestId);
    
    const response: ApiResponse<OracleRow[]> = {
      success: true,
      data,
      page: params.page,
      pageSize: params.pageSize,
      total,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/prestadores/{prestadorId}:
 *   get:
 *     summary: Detalhes de um prestador
 *     description: Retorna dados completos de um prestador
 *     tags: [Prestadores]
 *     parameters:
 *       - in: path
 *         name: prestadorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dados do prestador
 *       404:
 *         description: Prestador não encontrado
 */
router.get('/:prestadorId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prestadorId } = req.params;
    
    const data = await queryById(VIEW_NAME, PRESTADOR_ID_COLUMN, prestadorId, req.requestId);
    
    if (!data) {
      throw Errors.notFound('Prestador');
    }
    
    const response: ApiResponse<OracleRow> = {
      success: true,
      data,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
