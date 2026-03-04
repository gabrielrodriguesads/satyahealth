/**
 * Guias Routes
 * Endpoints for VW_TISS_GUIA_LOTE view
 */
import { Router, Request, Response, NextFunction } from 'express';
import { queryView, queryGroupedById } from '../services/viewQueryService';
import { getColumnNames } from '../services/viewMetadataService';
import { ApiError, Errors } from '../middlewares/errorHandler';
import config from '../config';
import { ViewQueryParams, ApiResponse, OracleRow } from '../types';

const router = Router();

// View name
const VIEW_NAME = config.views.guias;
const GUIA_ID_COLUMN = config.views.guiaIdColumn;
const ITEM_ID_COLUMN = config.views.itemIdColumn;

// Main columns for grouping (fields that belong to the guia, not the item)
const GUIA_MAIN_COLUMNS = [
  'GUIA_ID',
  'NUMERO_GUIA',
  'DATA_AUTORIZACAO',
  'SENHA_AUTORIZACAO',
  'VALIDADE_SENHA',
  'NUMERO_GUIA_PRINCIPAL',
  'DATA_EMISSAO_GUIA',
  'TIPO_GUIA',
  'CODIGO_OPERADORA',
  'NOME_OPERADORA',
  'REGISTRO_ANS',
  'NUMERO_CARTEIRA',
  'VALIDADE_CARTEIRA',
  'NOME_BENEFICIARIO',
  'CNS_BENEFICIARIO',
  'ATENDIMENTO_RN',
  'CNPJ_CONTRATADO_EXECUTANTE',
  'NOME_CONTRATADO_EXECUTANTE',
  'CNES_CONTRATADO',
  'TIPO_ATENDIMENTO',
  'INDICACAO_ACIDENTE',
  'CARATER_ATENDIMENTO',
  'DATA_INICIO_FATURAMENTO',
  'HORA_INICIO_FATURAMENTO',
  'DATA_FIM_FATURAMENTO',
  'HORA_FIM_FATURAMENTO',
  'TIPO_CONSULTA',
  'MOTIVO_ENCERRAMENTO',
  'CNPJ_CONTRATADO_SOLICITANTE',
  'NOME_CONTRATADO_SOLICITANTE',
  'CODIGO_PROFISSIONAL_SOLICITANTE',
  'NOME_PROFISSIONAL_SOLICITANTE',
  'CONSELHO_SOLICITANTE',
  'UF_CONSELHO_SOLICITANTE',
  'CBO_SOLICITANTE',
  'INDICACAO_CLINICA',
  'OBSERVACAO',
];

/**
 * Parse query params for filtering and pagination
 */
function parseQueryParams(query: Request['query']): ViewQueryParams {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string) || 20));
  const sort = query.sort as string | undefined;
  const order = (query.order as string)?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  
  // Extract filters (any query param that's not pagination/sort)
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
 * /api/guias:
 *   get:
 *     summary: Lista guias TISS
 *     description: Retorna lista de guias com procedimentos da view VW_TISS_GUIA_LOTE
 *     tags: [Guias]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Itens por página
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Coluna para ordenação
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *         description: Direção da ordenação
 *       - in: query
 *         name: guiaId
 *         schema:
 *           type: string
 *         description: Filtro por ID da guia
 *       - in: query
 *         name: numeroGuia
 *         schema:
 *           type: string
 *         description: Filtro por número da guia
 *       - in: query
 *         name: beneficiarioId
 *         schema:
 *           type: string
 *         description: Filtro por ID do beneficiário
 *       - in: query
 *         name: prestadorId
 *         schema:
 *           type: string
 *         description: Filtro por ID do prestador
 *     responses:
 *       200:
 *         description: Lista de guias
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 page:
 *                   type: integer
 *                 pageSize:
 *                   type: integer
 *                 total:
 *                   type: integer
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
 * /api/guias/{guiaId}:
 *   get:
 *     summary: Detalhes de uma guia
 *     description: Retorna dados da guia agrupados com array de procedimentos
 *     tags: [Guias]
 *     parameters:
 *       - in: path
 *         name: guiaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da guia
 *     responses:
 *       200:
 *         description: Dados da guia com procedimentos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     guia:
 *                       type: object
 *                     procedimentos:
 *                       type: array
 *       404:
 *         description: Guia não encontrada
 */
router.get('/:guiaId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { guiaId } = req.params;
    
    const { main, items } = await queryGroupedById(
      VIEW_NAME,
      GUIA_ID_COLUMN,
      guiaId,
      ITEM_ID_COLUMN,
      GUIA_MAIN_COLUMNS,
      req.requestId
    );
    
    if (!main) {
      throw Errors.notFound('Guia');
    }
    
    const response: ApiResponse<{ guia: OracleRow; procedimentos: OracleRow[] }> = {
      success: true,
      data: {
        guia: main,
        procedimentos: items,
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
