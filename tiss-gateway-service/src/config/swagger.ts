/**
 * Swagger Configuration
 */
import swaggerJsdoc from 'swagger-jsdoc';
import config from '../config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TISS Gateway Service API',
      version: '1.0.0',
      description: `
API REST para exposição de dados TISS via Oracle Views.

## Conceito

Esta API expõe dados de 3 views Oracle de forma dinâmica:
- **VW_TISS_GUIA_LOTE** - Guias TISS com procedimentos
- **VW_TISS_CONTA_LOTE** - Contas médicas com itens
- **VW_TISS_PRESTADORES** - Cadastro de prestadores

### Regra de Ouro
Os nomes das colunas no JSON de resposta são **exatamente** os nomes das colunas das views Oracle.
Você controla o layout dos campos entregando as views com os nomes corretos.

## Recursos

- Paginação (page, pageSize)
- Ordenação (sort, order)
- Filtros dinâmicos via query string
- Agrupamento de itens em endpoints de detalhe
- Validação de colunas via metadata
      `,
      contact: {
        name: 'Satya Healthcare',
        email: 'suporte@satya.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.api.port}`,
        description: 'Servidor local',
      },
    ],
    tags: [
      { name: 'Health', description: 'Status da API' },
      { name: 'Guias', description: 'Guias TISS (VW_TISS_GUIA_LOTE)' },
      { name: 'Contas', description: 'Contas Médicas (VW_TISS_CONTA_LOTE)' },
      { name: 'Prestadores', description: 'Prestadores (VW_TISS_PRESTADORES)' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
