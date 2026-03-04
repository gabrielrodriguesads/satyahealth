# TISS Gateway Service

API REST em Node.js + TypeScript para exposição de dados TISS via Oracle Views.

## Conceito Principal

Esta API não possui mapeamento fixo de campos. Ela:

1. **Consulta as VIEWS no Oracle** em tempo de inicialização para descobrir as colunas
2. **Retorna JSON com chaves = nomes das colunas** da view
3. **Você controla o layout** entregando as VIEWS com os nomes corretos

### Regra de Ouro
> Os nomes das colunas no JSON de resposta são **exatamente** os nomes das colunas das views Oracle.

## Stack Tecnológica

- **Runtime**: Node.js 18+
- **Linguagem**: TypeScript
- **Framework**: Express
- **Banco**: Oracle (driver oficial `oracledb`)
- **Documentação**: Swagger/OpenAPI

## Instalação

```bash
# Instalar dependências
npm install

# ou com yarn
yarn install
```

## Configuração

Crie um arquivo `.env` baseado no `.env.example`:

```env
# Oracle Database
ORACLE_USER=seu_usuario
ORACLE_PASSWORD=sua_senha
ORACLE_CONNECT_STRING=host:porta/service_name

# Connection Pool
ORACLE_POOL_MIN=2
ORACLE_POOL_MAX=10
ORACLE_POOL_INCREMENT=1

# API
API_PORT=3001
API_PREFIX=/api

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

## Executando

```bash
# Desenvolvimento (hot reload)
npm run dev

# Produção
npm run build
npm start
```

## Endpoints

### Health Check
```
GET /health
```

### Guias TISS
```
GET /api/guias                    # Lista com paginação
GET /api/guias/:guiaId            # Detalhe com procedimentos agrupados
```

### Contas Médicas
```
GET /api/contas                   # Lista com paginação
GET /api/contas/:contaId          # Detalhe com itens agrupados
```

### Prestadores
```
GET /api/prestadores              # Lista com paginação
GET /api/prestadores/:prestadorId # Detalhe
```

### Swagger
```
GET /docs                         # Documentação interativa
```

## Parâmetros de Query

### Paginação
| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `page` | number | 1 | Número da página |
| `pageSize` | number | 20 | Itens por página (máx 100) |

### Ordenação
| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `sort` | string | - | Nome da coluna para ordenar |
| `order` | string | ASC | ASC ou DESC |

### Filtros
Qualquer coluna da view pode ser usada como filtro:
```
GET /api/guias?NUMERO_GUIA=123456
GET /api/guias?TIPO_GUIA=SP/SADT&DATA_INICIO=2024-01-01
GET /api/prestadores?UF=SP&CIDADE=São Paulo
```

## Formato de Resposta

### Sucesso (Lista)
```json
{
  "success": true,
  "data": [...],
  "page": 1,
  "pageSize": 20,
  "total": 150,
  "requestId": "uuid",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Sucesso (Detalhe Agrupado)
```json
{
  "success": true,
  "data": {
    "guia": { ... campos da guia ... },
    "procedimentos": [ ... array de itens ... ]
  },
  "requestId": "uuid",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Erro
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Guia não encontrada"
  },
  "requestId": "uuid",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Views Oracle Necessárias

### VW_TISS_GUIA_LOTE

Campos recomendados para o padrão TISS loteGuia:

```sql
CREATE OR REPLACE VIEW VW_TISS_GUIA_LOTE AS
SELECT
  -- Identificadores (obrigatórios para agrupamento)
  GUIA_ID,                          -- PK da guia
  ITEM_ID,                          -- PK do item/procedimento
  
  -- Dados da Guia
  NUMERO_GUIA,
  DATA_AUTORIZACAO,
  SENHA_AUTORIZACAO,
  VALIDADE_SENHA,
  NUMERO_GUIA_PRINCIPAL,
  DATA_EMISSAO_GUIA,
  TIPO_GUIA,
  
  -- Operadora
  CODIGO_OPERADORA,
  NOME_OPERADORA,
  REGISTRO_ANS,
  
  -- Beneficiário
  NUMERO_CARTEIRA,
  VALIDADE_CARTEIRA,
  NOME_BENEFICIARIO,
  CNS_BENEFICIARIO,
  ATENDIMENTO_RN,
  
  -- Contratado Executante
  CNPJ_CONTRATADO_EXECUTANTE,
  NOME_CONTRATADO_EXECUTANTE,
  CNES_CONTRATADO,
  
  -- Atendimento
  TIPO_ATENDIMENTO,
  INDICACAO_ACIDENTE,
  CARATER_ATENDIMENTO,
  DATA_INICIO_FATURAMENTO,
  HORA_INICIO_FATURAMENTO,
  DATA_FIM_FATURAMENTO,
  HORA_FIM_FATURAMENTO,
  TIPO_CONSULTA,
  MOTIVO_ENCERRAMENTO,
  
  -- Solicitante
  CNPJ_CONTRATADO_SOLICITANTE,
  NOME_CONTRATADO_SOLICITANTE,
  CODIGO_PROFISSIONAL_SOLICITANTE,
  NOME_PROFISSIONAL_SOLICITANTE,
  CONSELHO_SOLICITANTE,
  UF_CONSELHO_SOLICITANTE,
  CBO_SOLICITANTE,
  
  -- Indicação
  INDICACAO_CLINICA,
  OBSERVACAO,
  
  -- Procedimento (variam por item)
  SEQUENCIAL_ITEM,
  DATA_EXECUCAO,
  HORA_INICIAL,
  HORA_FINAL,
  CODIGO_TABELA,
  CODIGO_PROCEDIMENTO,
  DESCRICAO_PROCEDIMENTO,
  QUANTIDADE_EXECUTADA,
  QUANTIDADE_AUTORIZADA,
  VALOR_UNITARIO,
  VALOR_TOTAL,
  VIA_ACESSO,
  TECNICA_UTILIZADA,
  REDUCAO_ACRESCIMO,
  FATOR_REDUCAO_ACRESCIMO,
  
  -- Profissional Executante
  CODIGO_PROFISSIONAL_EXECUTANTE,
  NOME_PROFISSIONAL_EXECUTANTE,
  CONSELHO_EXECUTANTE,
  UF_CONSELHO_EXECUTANTE,
  CBO_EXECUTANTE,
  CODIGO_PARTICIPACAO
  
FROM ... -- suas tabelas de origem
```

### VW_TISS_CONTA_LOTE

```sql
CREATE OR REPLACE VIEW VW_TISS_CONTA_LOTE AS
SELECT
  CONTA_ID,                         -- PK da conta
  ITEM_ID,                          -- PK do item
  
  -- Dados do Lote
  NUMERO_LOTE,
  NUMERO_PROTOCOLO,
  DATA_ENVIO,
  
  -- Operadora
  CODIGO_OPERADORA,
  NOME_OPERADORA,
  REGISTRO_ANS,
  
  -- Contratado
  CNPJ_CONTRATADO,
  NOME_CONTRATADO,
  CNES_CONTRATADO,
  
  -- Guia
  NUMERO_GUIA,
  NUMERO_GUIA_OPERADORA,
  SENHA_AUTORIZACAO,
  
  -- Beneficiário
  NUMERO_CARTEIRA,
  NOME_BENEFICIARIO,
  
  -- Período
  DATA_INICIO_FATURAMENTO,
  DATA_FIM_FATURAMENTO,
  
  -- Valores
  VALOR_TOTAL_INFORMADO,
  VALOR_TOTAL_PAGO,
  DATA_PAGAMENTO,
  VALOR_GLOSA,
  CODIGO_GLOSA,
  DESCRICAO_GLOSA,
  
  -- Item
  SEQUENCIAL_ITEM,
  CODIGO_PROCEDIMENTO,
  DESCRICAO_PROCEDIMENTO,
  QUANTIDADE,
  VALOR_UNITARIO_INFORMADO,
  VALOR_TOTAL_INFORMADO_ITEM,
  VALOR_UNITARIO_PAGO,
  VALOR_TOTAL_PAGO_ITEM,
  VALOR_GLOSA_ITEM,
  CODIGO_GLOSA_ITEM
  
FROM ... -- suas tabelas de origem
```

### VW_TISS_PRESTADORES

```sql
CREATE OR REPLACE VIEW VW_TISS_PRESTADORES AS
SELECT
  PRESTADOR_ID,                     -- PK
  
  -- Identificação
  CNPJ,
  CPF,
  CNES,
  RAZAO_SOCIAL,
  NOME_FANTASIA,
  
  -- Endereço
  LOGRADOURO,
  NUMERO,
  COMPLEMENTO,
  BAIRRO,
  CIDADE,
  UF,
  CEP,
  
  -- Contato
  TELEFONE,
  EMAIL,
  
  -- Classificação
  TIPO_PRESTADOR,
  ESPECIALIDADE_PRINCIPAL,
  
  -- Status
  SITUACAO,
  DATA_CREDENCIAMENTO,
  DATA_DESCREDENCIAMENTO
  
FROM ... -- suas tabelas de origem
```

## Estrutura do Projeto

```
tiss-gateway-service/
├── src/
│   ├── config/
│   │   ├── index.ts          # Configurações via env
│   │   └── swagger.ts        # Swagger config
│   ├── db/
│   │   └── oraclePool.ts     # Pool de conexões Oracle
│   ├── services/
│   │   ├── viewMetadataService.ts   # Descoberta de colunas
│   │   └── viewQueryService.ts      # Queries dinâmicas
│   ├── routes/
│   │   ├── guias.ts
│   │   ├── contas.ts
│   │   ├── prestadores.ts
│   │   └── health.ts
│   ├── middlewares/
│   │   ├── requestId.ts      # UUID por request
│   │   ├── requestLogger.ts  # Log de requests
│   │   └── errorHandler.ts   # Tratamento de erros
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   ├── utils/
│   │   └── logger.ts         # Winston logger
│   └── index.ts              # Entry point
├── tests/
├── logs/
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Segurança

- **SQL Injection**: Prevenido via bind variables e validação de colunas
- **Ordenação**: Apenas colunas existentes na view são aceitas
- **Filtros**: Colunas inválidas são ignoradas com warning no log
- **Headers**: Helmet para headers de segurança

## Logs

Logs estruturados com Winston:
- Request ID em todas as entradas
- Tempo de execução de queries
- Rotação automática de arquivos
- Níveis: error, warn, info, debug

## Testes

```bash
npm test
```

## Exemplos de Uso

### Listar guias com filtro
```bash
curl "http://localhost:3001/api/guias?TIPO_GUIA=SP/SADT&page=1&pageSize=10"
```

### Detalhe de guia com procedimentos
```bash
curl "http://localhost:3001/api/guias/12345"
```

### Listar prestadores por UF
```bash
curl "http://localhost:3001/api/prestadores?UF=SP&sort=RAZAO_SOCIAL&order=ASC"
```

### Health check
```bash
curl "http://localhost:3001/health"
```

## Licença

MIT
