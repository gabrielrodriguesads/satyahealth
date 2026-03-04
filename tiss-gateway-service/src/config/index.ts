/**
 * TISS Gateway Service - Configuration
 * Loads environment variables and provides typed config
 */
import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface OracleConfig {
  user: string;
  password: string;
  connectString: string;
  poolMin: number;
  poolMax: number;
  poolIncrement: number;
}

export interface ApiConfig {
  port: number;
  prefix: string;
  environment: string;
}

export interface LogConfig {
  level: string;
}

export interface ViewConfig {
  guias: string;
  contas: string;
  prestadores: string;
  // Primary key columns for each view
  guiaIdColumn: string;
  contaIdColumn: string;
  prestadorIdColumn: string;
  itemIdColumn: string;
}

export interface Config {
  oracle: OracleConfig;
  api: ApiConfig;
  log: LogConfig;
  views: ViewConfig;
}

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
}

export const config: Config = {
  oracle: {
    user: getEnv('ORACLE_USER', 'system'),
    password: getEnv('ORACLE_PASSWORD', 'oracle'),
    connectString: getEnv('ORACLE_CONNECT_STRING', 'localhost:1521/XEPDB1'),
    poolMin: getEnvNumber('ORACLE_POOL_MIN', 2),
    poolMax: getEnvNumber('ORACLE_POOL_MAX', 10),
    poolIncrement: getEnvNumber('ORACLE_POOL_INCREMENT', 1),
  },
  api: {
    port: getEnvNumber('API_PORT', 3001),
    prefix: getEnv('API_PREFIX', '/api'),
    environment: getEnv('NODE_ENV', 'development'),
  },
  log: {
    level: getEnv('LOG_LEVEL', 'info'),
  },
  views: {
    guias: 'VW_TISS_GUIA_LOTE',
    contas: 'VW_TISS_CONTA_LOTE',
    prestadores: 'VW_TISS_PRESTADORES',
    guiaIdColumn: 'GUIA_ID',
    contaIdColumn: 'CONTA_ID',
    prestadorIdColumn: 'PRESTADOR_ID',
    itemIdColumn: 'ITEM_ID',
  },
};

export default config;
