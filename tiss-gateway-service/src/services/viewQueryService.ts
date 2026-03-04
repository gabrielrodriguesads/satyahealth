/**
 * View Query Service
 * Handles dynamic queries to Oracle views with pagination, filtering, and sorting
 */
import oracledb from 'oracledb';
import { getConnection } from '../db/oraclePool';
import { 
  isValidColumn, 
  getColumnNames, 
  validateSortColumn, 
  validateFilterColumns,
  getColumnMetadata 
} from './viewMetadataService';
import { OracleRow, ViewQueryParams } from '../types';
import logger from '../utils/logger';

// Date types that should be converted to ISO strings
const DATE_TYPES = ['DATE', 'TIMESTAMP', 'TIMESTAMP WITH TIME ZONE', 'TIMESTAMP WITH LOCAL TIME ZONE'];

/**
 * Convert Oracle value to JSON-safe format
 */
function convertValue(value: unknown, dataType?: string): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Handle Date/Timestamp conversion to ISO string
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  // Handle CLOB (already configured to fetch as string)
  if (typeof value === 'string' && dataType && DATE_TYPES.includes(dataType.toUpperCase())) {
    // Try to parse as date if it's a date type stored as string
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  
  return value;
}

/**
 * Convert Oracle row to JSON with proper type handling
 */
function convertRow(row: Record<string, unknown>, viewName: string): OracleRow {
  const converted: OracleRow = {};
  
  for (const [key, value] of Object.entries(row)) {
    const metadata = getColumnMetadata(viewName, key);
    converted[key] = convertValue(value, metadata?.dataType);
  }
  
  return converted;
}

/**
 * Build WHERE clause from filters
 */
function buildWhereClause(
  viewName: string,
  filters: Record<string, string | number | Date>,
  binds: Record<string, unknown>
): string {
  const conditions: string[] = [];
  let bindIndex = 0;
  
  for (const [column, value] of Object.entries(filters)) {
    // Skip invalid columns (already validated, but double check)
    if (!isValidColumn(viewName, column)) {
      continue;
    }
    
    const bindName = `filter${bindIndex++}`;
    const upperColumn = column.toUpperCase();
    
    // Handle date range filters
    if (column.toLowerCase().endsWith('inicio') || column.toLowerCase().endsWith('start')) {
      conditions.push(`${upperColumn} >= :${bindName}`);
      binds[bindName] = value;
    } else if (column.toLowerCase().endsWith('fim') || column.toLowerCase().endsWith('end')) {
      conditions.push(`${upperColumn} <= :${bindName}`);
      binds[bindName] = value;
    } else if (typeof value === 'string' && value.includes('%')) {
      // LIKE query for strings with wildcards
      conditions.push(`UPPER(${upperColumn}) LIKE UPPER(:${bindName})`);
      binds[bindName] = value;
    } else {
      // Exact match
      conditions.push(`${upperColumn} = :${bindName}`);
      binds[bindName] = value;
    }
  }
  
  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

/**
 * Build ORDER BY clause
 */
function buildOrderByClause(viewName: string, sort?: string, order?: 'ASC' | 'DESC'): string {
  if (!sort) return '';
  
  // Validate sort column
  if (!validateSortColumn(viewName, sort)) {
    logger.warn(`Invalid sort column '${sort}' for view '${viewName}'`);
    return '';
  }
  
  const direction = order === 'DESC' ? 'DESC' : 'ASC';
  return `ORDER BY ${sort.toUpperCase()} ${direction}`;
}

/**
 * Query a view with pagination, filtering, and sorting
 */
export async function queryView(
  viewName: string,
  params: ViewQueryParams,
  requestId?: string
): Promise<{ data: OracleRow[]; total: number }> {
  const startTime = Date.now();
  const log = requestId ? logger.child({ requestId }) : logger;
  
  // Validate filter columns
  const invalidFilters = validateFilterColumns(viewName, params.filters);
  if (invalidFilters.length > 0) {
    log.warn(`Ignoring invalid filter columns: ${invalidFilters.join(', ')}`);
    // Remove invalid filters
    for (const col of invalidFilters) {
      delete params.filters[col];
    }
  }
  
  const connection = await getConnection();
  
  try {
    // Get column list for SELECT (avoid SELECT *)
    const columns = getColumnNames(viewName);
    if (columns.length === 0) {
      throw new Error(`No columns found for view: ${viewName}`);
    }
    
    const columnList = columns.join(', ');
    const binds: Record<string, unknown> = {};
    
    // Build WHERE clause
    const whereClause = buildWhereClause(viewName, params.filters, binds);
    
    // Build ORDER BY clause
    const orderByClause = buildOrderByClause(viewName, params.sort, params.order);
    
    // Count total records
    const countSql = `SELECT COUNT(*) as "total" FROM ${viewName} ${whereClause}`;
    const countResult = await connection.execute<{ total: number }>(countSql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    const total = countResult.rows?.[0]?.total ?? 0;
    
    // Calculate pagination
    const offset = (params.page - 1) * params.pageSize;
    
    // Build paginated query with Oracle 12c+ syntax
    const dataSql = `
      SELECT ${columnList}
      FROM ${viewName}
      ${whereClause}
      ${orderByClause}
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;
    
    const dataBinds = {
      ...binds,
      offset,
      limit: params.pageSize,
    };
    
    const dataResult = await connection.execute<Record<string, unknown>>(dataSql, dataBinds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    
    // Convert rows with proper type handling
    const data = (dataResult.rows || []).map((row: Record<string, unknown>) => convertRow(row, viewName));
    
    const duration = Date.now() - startTime;
    log.info(`Query executed`, {
      view: viewName,
      total,
      returned: data.length,
      page: params.page,
      pageSize: params.pageSize,
      duration: `${duration}ms`,
    });
    
    return { data, total };
  } finally {
    await connection.close();
  }
}

/**
 * Query a single record by ID
 */
export async function queryById(
  viewName: string,
  idColumn: string,
  idValue: string | number,
  requestId?: string
): Promise<OracleRow | null> {
  const log = requestId ? logger.child({ requestId }) : logger;
  
  if (!isValidColumn(viewName, idColumn)) {
    throw new Error(`Invalid ID column '${idColumn}' for view '${viewName}'`);
  }
  
  const connection = await getConnection();
  
  try {
    const columns = getColumnNames(viewName);
    const columnList = columns.join(', ');
    
    const sql = `
      SELECT ${columnList}
      FROM ${viewName}
      WHERE ${idColumn.toUpperCase()} = :id
    `;
    
    const result = await connection.execute<Record<string, unknown>>(sql, { id: idValue }, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    
    if (!result.rows || result.rows.length === 0) {
      log.info(`Record not found`, { view: viewName, idColumn, idValue });
      return null;
    }
    
    return convertRow(result.rows[0], viewName);
  } finally {
    await connection.close();
  }
}

/**
 * Query and group by main ID (for detail endpoints with items)
 */
export async function queryGroupedById(
  viewName: string,
  mainIdColumn: string,
  mainIdValue: string | number,
  itemIdColumn: string,
  mainColumns: string[],
  requestId?: string
): Promise<{ main: OracleRow | null; items: OracleRow[] }> {
  const log = requestId ? logger.child({ requestId }) : logger;
  
  if (!isValidColumn(viewName, mainIdColumn)) {
    throw new Error(`Invalid main ID column '${mainIdColumn}' for view '${viewName}'`);
  }
  
  const connection = await getConnection();
  
  try {
    const columns = getColumnNames(viewName);
    const columnList = columns.join(', ');
    
    const sql = `
      SELECT ${columnList}
      FROM ${viewName}
      WHERE ${mainIdColumn.toUpperCase()} = :id
      ORDER BY ${isValidColumn(viewName, itemIdColumn) ? itemIdColumn.toUpperCase() : 'ROWNUM'}
    `;
    
    const result = await connection.execute<Record<string, unknown>>(sql, { id: mainIdValue }, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    
    if (!result.rows || result.rows.length === 0) {
      log.info(`Grouped record not found`, { view: viewName, mainIdColumn, mainIdValue });
      return { main: null, items: [] };
    }
    
    // Convert all rows
    const convertedRows = result.rows.map((row: Record<string, unknown>) => convertRow(row, viewName));
    
    // Extract main fields from first row
    const main: OracleRow = {};
    const allColumns = getColumnNames(viewName);
    
    // Determine which columns are "main" vs "item"
    // Main columns are those that don't change across items (or specified in mainColumns)
    const mainColumnSet = new Set(mainColumns.map(c => c.toUpperCase()));
    
    for (const col of allColumns) {
      const upperCol = col.toUpperCase();
      // Include in main if it's in the main columns list, or if value is same across all rows
      if (mainColumnSet.has(upperCol) || isConstantAcrossRows(convertedRows, col)) {
        main[col] = convertedRows[0][col];
      }
    }
    
    // Extract item fields (all columns that vary)
    const items = convertedRows.map((row: OracleRow) => {
      const item: OracleRow = {};
      for (const col of allColumns) {
        if (!mainColumnSet.has(col.toUpperCase()) && !isConstantAcrossRows(convertedRows, col)) {
          item[col] = row[col];
        }
      }
      return item;
    });
    
    log.info(`Grouped query executed`, {
      view: viewName,
      mainIdValue,
      itemCount: items.length,
    });
    
    return { main, items };
  } finally {
    await connection.close();
  }
}

/**
 * Check if a column has the same value across all rows
 */
function isConstantAcrossRows(rows: OracleRow[], column: string): boolean {
  if (rows.length <= 1) return true;
  const firstValue = JSON.stringify(rows[0][column]);
  return rows.every(row => JSON.stringify(row[column]) === firstValue);
}

export default {
  queryView,
  queryById,
  queryGroupedById,
};
