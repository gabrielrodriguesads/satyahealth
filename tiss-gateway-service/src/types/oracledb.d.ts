declare module 'oracledb' {
  export interface PoolAttributes {
    user: string;
    password: string;
    connectString: string;
    poolMin?: number;
    poolMax?: number;
    poolIncrement?: number;
    poolTimeout?: number;
    queueTimeout?: number;
    enableStatistics?: boolean;
  }

  export interface ExecuteOptions {
    outFormat?: number;
    autoCommit?: boolean;
    maxRows?: number;
    fetchArraySize?: number;
  }

  export interface Result<T> {
    rows?: T[];
    metaData?: MetaData[];
    rowsAffected?: number;
  }

  export interface MetaData {
    name: string;
  }

  export type BindParameters = Record<string, unknown>;

  export interface Connection {
    execute<T = unknown>(sql: string, binds?: BindParameters, options?: ExecuteOptions): Promise<Result<T>>;
    close(): Promise<void>;
  }

  export interface PoolStatistics {
    poolMax?: number;
    poolMin?: number;
    connectionsInUse?: number;
    connectionsOpen?: number;
  }

  export interface Pool {
    getConnection(): Promise<Connection>;
    close(drainTime?: number): Promise<void>;
    getStatistics(): PoolStatistics;
    status: number;
  }

  export function createPool(attrs: PoolAttributes): Promise<Pool>;
  
  export const OUT_FORMAT_OBJECT: number;
  export const POOL_STATUS_OPEN: number;
  export const CLOB: number;
  
  export let outFormat: number;
  export let autoCommit: boolean;
  export let fetchAsString: number[];
}
