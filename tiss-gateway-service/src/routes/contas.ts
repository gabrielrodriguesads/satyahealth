/**
 * Contas Routes
 * Endpoints for VW_TISS_CONTA_LOTE view
 */
import { Router, Request, Response, NextFunction } from 'express';
import { queryView, queryGroupedById } from '../services/viewQueryService';
import { Errors } from '../middlewares/errorHandler';
import config from '../config';
import { ViewQueryParams, ApiResponse, OracleRow } from '../types';

const router = Router();

// View name
const VIEW_NAME = config.views.contas;
const CONTA_ID_COLUMN = config.views.contaIdColumn;
const ITEM_ID_COLUMN = config.views.itemIdColumn;

// Main columns for grouping (fields that belong to the conta, not the item)
const CONTA_MAIN_COLUMNS = [
  'CONTA_ID',
  'NUMERO_LOTE',
  'NUMERO_PROTOCOLO',
  'DATA_ENVIO',
  'CODIGO_OPERADORA',
  'NOME_OPERADORA',
  'REGISTRO_ANS',
  'CNPJ_CONTRATADO',
  'NOME_CONTRATADO',
  'CNES_CONTRATADO',
  'NUMERO_GUIA',
  'NUMERO_GUIA_OPERADORA',
  'SENHA_AUTORIZACAO',
  'DATA_INICIO_FATURAMENTO',
  'DATA_FIM_FATURAMENTO',
  'NUMERO_CARTEIRA',
  'NOME_BENEFICIARIO',
  'VALOR_TOTAL_INFORMADO',
  'VALOR_TOTAL_PAGO',
  'DATA_PAGAMENTO',
  'VALOR_GLOSA',
  'CODIGO_GLOSA',
  'DESCRICAO_GLOSA',
];

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
 * /api/contas:
 *   get:
 *     summary: Lista contas médicas
 *     description: Retorna lista de contas da view VW_TISS_CONTA_LOTE
 *     tags: [Contas]
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
 *         name: contaId
 *         schema:
 *           type: string
 *       - in: query
 *         name: numeroLote
 *         schema:
 *           type: string
 *       - in: query
 *         name: prestadorId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de contas
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
 * /api/contas/{contaId}:
 *   get:
 *     summary: Detalhes de uma conta
 *     description: Retorna dados da conta agrupados com array de itens
 *     tags: [Contas]
 *     parameters:
 *       - in: path
 *         name: contaId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dados da conta com itens
 *       404:
 *         description: Conta não encontrada
 */
router.get('/:contaId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contaId } = req.params;
    
    const { main, items } = await queryGroupedById(
      VIEW_NAME,
      CONTA_ID_COLUMN,
      contaId,
      ITEM_ID_COLUMN,
      CONTA_MAIN_COLUMNS,
      req.requestId
    );
    
    if (!main) {
      throw Errors.notFound('Conta');
    }
    
    const response: ApiResponse<{ conta: OracleRow; itens: OracleRow[] }> = {
      success: true,
      data: {
        conta: main,
        itens: items,
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
