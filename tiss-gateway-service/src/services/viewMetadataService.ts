/**
 * View Metadata Service
 * Discovers and caches column metadata from Oracle views
 */
import oracledb from 'oracledb';
import { getConnection } from '../db/oraclePool';
import { ColumnMetadata, ViewMetadata } from '../types';
import logger from '../utils/logger';
import config from '../config';

// Cache for view metadata
const viewMetadataCache = new Map<string, ViewMetadata>();

// Cache refresh interval (1 hour)
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Fetch column metadata for a view from Oracle
 */
async function fetchViewColumns(viewName: string): Promise<ColumnMetadata[]> {
  const connection = await getConnection();
  
  try {
    // Query ALL_TAB_COLUMNS for view metadata
    const sql = `
      SELECT 
        COLUMN_NAME as "columnName",
        DATA_TYPE as "dataType",
        NULLABLE as "nullable",
        DATA_LENGTH as "dataLength",
        DATA_PRECISION as "dataPrecision",
        DATA_SCALE as "dataScale"
      FROM ALL_TAB_COLUMNS
      WHERE TABLE_NAME = :viewName
      ORDER BY COLUMN_ID
    `;
    
    const result = await connection.execute<ColumnMetadata>(sql, { viewName: viewName.toUpperCase() }, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    
    if (!result.rows || result.rows.length === 0) {
      logger.warn(`No columns found for view: ${viewName}`);
      return [];
    }
    
    return result.rows.map((row: ColumnMetadata) => ({
      columnName: row.columnName,
      dataType: row.dataType,
      nullable: row.nullable === true || (row as unknown as Record<string, unknown>).nullable === 'Y',
      dataLength: row.dataLength,
      dataPrecision: row.dataPrecision,
      dataScale: row.dataScale,
    }));
  } finally {
    await connection.close();
  }
}

/**
 * Load metadata for a view (with caching)
 */
export async function loadViewMetadata(viewName: string): Promise<ViewMetadata> {
  const cached = viewMetadataCache.get(viewName);
  
  if (cached && (Date.now() - cached.lastRefreshed.getTime()) < CACHE_TTL_MS) {
    return cached;
  }
  
  logger.info(`Loading metadata for view: ${viewName}`);
  
  const columns = await fetchViewColumns(viewName);
  const columnNames = new Set(columns.map(c => c.columnName.toUpperCase()));
  
  const metadata: ViewMetadata = {
    viewName,
    columns,
    columnNames,
    lastRefreshed: new Date(),
  };
  
  viewMetadataCache.set(viewName, metadata);
  
  logger.info(`Loaded ${columns.length} columns for view: ${viewName}`, {
    columns: columns.map(c => c.columnName),
  });
  
  return metadata;
}

/**
 * Initialize metadata for all configured views
 */
export async function initializeViewMetadata(): Promise<void> {
  logger.info('Initializing view metadata...');
  
  const views = [
    config.views.guias,
    config.views.contas,
    config.views.prestadores,
  ];
  
  for (const viewName of views) {
    try {
      await loadViewMetadata(viewName);
    } catch (error) {
      logger.error(`Failed to load metadata for view: ${viewName}`, { error });
      // Continue with other views - don't fail completely
    }
  }
  
  logger.info(`View metadata initialization complete. Loaded ${viewMetadataCache.size} views`);
}

/**
 * Check if a column exists in a view
 */
export function isValidColumn(viewName: string, columnName: string): boolean {
  const metadata = viewMetadataCache.get(viewName);
  if (!metadata) return false;
  return metadata.columnNames.has(columnName.toUpperCase());
}

/**
 * Get all column names for a view
 */
export function getColumnNames(viewName: string): string[] {
  const metadata = viewMetadataCache.get(viewName);
  if (!metadata) return [];
  return metadata.columns.map(c => c.columnName);
}

/**
 * Get column metadata for a specific column
 */
export function getColumnMetadata(viewName: string, columnName: string): ColumnMetadata | undefined {
  const metadata = viewMetadataCache.get(viewName);
  if (!metadata) return undefined;
  return metadata.columns.find(c => c.columnName.toUpperCase() === columnName.toUpperCase());
}

/**
 * Validate sort column
 */
export function validateSortColumn(viewName: string, sortColumn: string): boolean {
  return isValidColumn(viewName, sortColumn);
}

/**
 * Validate filter columns
 */
export function validateFilterColumns(viewName: string, filters: Record<string, unknown>): string[] {
  const invalid: string[] = [];
  for (const column of Object.keys(filters)) {
    if (!isValidColumn(viewName, column)) {
      invalid.push(column);
    }
  }
  return invalid;
}

/**
 * Get view metadata cache status
 */
export function getMetadataCacheStatus(): { loaded: boolean; count: number; views: string[] } {
  return {
    loaded: viewMetadataCache.size > 0,
    count: viewMetadataCache.size,
    views: Array.from(viewMetadataCache.keys()),
  };
}

/**
 * Clear metadata cache
 */
export function clearMetadataCache(): void {
  viewMetadataCache.clear();
  logger.info('View metadata cache cleared');
}

export default {
  loadViewMetadata,
  initializeViewMetadata,
  isValidColumn,
  getColumnNames,
  getColumnMetadata,
  validateSortColumn,
  validateFilterColumns,
  getMetadataCacheStatus,
  clearMetadataCache,
};
