/**
 * Oracle Database Connection Pool
 * Manages Oracle connections with pooling
 */
import oracledb from 'oracledb';
import config from '../config';
import logger from '../utils/logger';

// Configure oracledb settings
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;
oracledb.fetchAsString = [oracledb.CLOB];

let pool: oracledb.Pool | null = null;

/**
 * Initialize Oracle connection pool
 */
export async function initializePool(): Promise<void> {
  try {
    logger.info('Initializing Oracle connection pool...');
    
    pool = await oracledb.createPool({
      user: config.oracle.user,
      password: config.oracle.password,
      connectString: config.oracle.connectString,
      poolMin: config.oracle.poolMin,
      poolMax: config.oracle.poolMax,
      poolIncrement: config.oracle.poolIncrement,
      poolTimeout: 60,
      queueTimeout: 60000,
      enableStatistics: true,
    });
    
    logger.info('Oracle connection pool initialized successfully', {
      poolMin: config.oracle.poolMin,
      poolMax: config.oracle.poolMax,
    });
    
    // Test connection
    const connection = await pool.getConnection();
    const result = await connection.execute('SELECT 1 FROM DUAL');
    await connection.close();
    
    logger.info('Oracle connection test successful');
  } catch (error) {
    logger.error('Failed to initialize Oracle connection pool', { error });
    throw error;
  }
}

/**
 * Get a connection from the pool
 */
export async function getConnection(): Promise<oracledb.Connection> {
  if (!pool) {
    throw new Error('Oracle connection pool not initialized');
  }
  return pool.getConnection();
}

/**
 * Get pool statistics
 */
export function getPoolStatistics(): oracledb.PoolStatistics | null {
  if (!pool) return null;
  return pool.getStatistics();
}

/**
 * Check if pool is connected
 */
export function isPoolConnected(): boolean {
  return pool !== null && pool.status === oracledb.POOL_STATUS_OPEN;
}

/**
 * Close the connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    try {
      logger.info('Closing Oracle connection pool...');
      await pool.close(10); // 10 second drain time
      pool = null;
      logger.info('Oracle connection pool closed');
    } catch (error) {
      logger.error('Error closing Oracle connection pool', { error });
      throw error;
    }
  }
}

/**
 * Execute a query with automatic connection management
 */
export async function executeQuery<T = unknown>(
  sql: string,
  binds: oracledb.BindParameters = {},
  options: oracledb.ExecuteOptions = {}
): Promise<oracledb.Result<T>> {
  const connection = await getConnection();
  try {
    const result = await connection.execute<T>(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      ...options,
    });
    return result;
  } finally {
    await connection.close();
  }
}

export default {
  initializePool,
  getConnection,
  getPoolStatistics,
  isPoolConnected,
  closePool,
  executeQuery,
};
