/**
 * Custom type definitions for TISS Gateway Service
 */

// Standard API Response
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  page?: number;
  pageSize?: number;
  total?: number;
  requestId?: string;
  timestamp?: string;
}

// Error Response
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
  };
  requestId?: string;
  timestamp?: string;
}

// Pagination parameters
export interface PaginationParams {
  page: number;
  pageSize: number;
}

// Sort parameters
export interface SortParams {
  sort?: string;
  order?: 'ASC' | 'DESC';
}

// Query parameters for views
export interface ViewQueryParams extends PaginationParams, SortParams {
  filters: Record<string, string | number | Date>;
}

// Column metadata from Oracle
export interface ColumnMetadata {
  columnName: string;
  dataType: string;
  nullable: boolean;
  dataLength?: number;
  dataPrecision?: number;
  dataScale?: number;
}

// View metadata cache
export interface ViewMetadata {
  viewName: string;
  columns: ColumnMetadata[];
  columnNames: Set<string>;
  lastRefreshed: Date;
}

// Oracle row result (dynamic columns)
export type OracleRow = Record<string, unknown>;

// Grouped result for detail endpoints
export interface GroupedResult<T, I> {
  main: T;
  items: I[];
}

// Filter configuration
export interface FilterConfig {
  column: string;
  operator: '=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'BETWEEN';
  value: unknown;
  valueTo?: unknown; // For BETWEEN
}

// Request with ID
export interface RequestWithId extends Express.Request {
  requestId: string;
  startTime: number;
}

// Health status
export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database: {
    connected: boolean;
    poolSize?: number;
    activeConnections?: number;
  };
  views: {
    loaded: boolean;
    count: number;
  };
}
