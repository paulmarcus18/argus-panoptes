/**
 * DORA Metrics Service Implementation
 * 
 * This module provides functionality for retrieving and analyzing DevOps Research and Assessment (DORA)
 * metrics from a database. It implements the following key metrics:
 * - Deployment Frequency (DF)
 * - Mean Lead Time for Changes (MLTC)
 * - Change Failure Rate (CFR)
 * - Mean Time to Restore (MTTR)
 * 
 * Each metric can be aggregated on daily or monthly basis for specified projects and date ranges.
 */
import {
  LoggerService,
  resolvePackagePath,
} from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { createDbPool, DbConfig } from './db';
import mysql from 'mysql2/promise';
import { MetricItem, DoraService, MetricType, Aggregation } from './types';
import fs from 'fs';

/**
 * Helper function to resolve the path to SQL query files
 * 
 * @param fileName - Name of the SQL file to load
 * @returns Absolute file path to the SQL file
 */
const getSqlFilePath = (fileName: string): string => {
  return resolvePackagePath(
    '@internal/plugin-dora-dashboard-backend',
    'src/services/DoraService/queries',
    fileName,
  );
};

/**
 * Retrieves daily Change Failure Rate (CFR) metrics
 * 
 * Change Failure Rate measures the percentage of deployments that lead to failures in production.
 * This function fetches daily CFR data for specified projects and date range.
 * 
 * @param pool - MySQL connection pool
 * @param projects - Array of project names to filter by
 * @param from - Start timestamp (seconds since epoch)
 * @param to - End timestamp (seconds since epoch)
 * @returns Promise resolving to array of CFR metric items with daily aggregation
 */
export async function get_daily_cfr(
  pool: mysql.Pool,
  projects: string[],
  from: number,
  to: number,
): Promise<MetricItem[]> {
  // Load SQL query from file
  const sqlFilePath = getSqlFilePath('cfr_daily.sql');
  let sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  // Create proper SQL placeholders for the IN clause based on number of projects
  const placeholders = projects.map(() => '?').join(', ');
  sqlQuery = sqlQuery.replace('IN (?)', `IN (${placeholders})`);

  // Convert Unix timestamps to ISO date strings
  const dateFrom = new Date(from * 1000).toISOString().split('T')[0];
  const dateTo = new Date(to * 1000).toISOString().split('T')[0];
  const params = [dateFrom, dateTo, ...projects, dateFrom, dateTo];

  try {
    // Execute the query and return results
    const [rows] = await pool.execute(sqlQuery, params);
    return rows as MetricItem[];
  } catch (error) {
    console.error('Database query failed:', error);
    throw error;
  }
}

export async function get_monthly_cfr(
  pool: mysql.Pool,
  projects: string[],
  from: number,
  to: number,
): Promise<MetricItem[]> {
  const sqlFilePath = getSqlFilePath('cfr_monthly.sql');
  let sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  const placeholders = projects.map(() => '?').join(', ');
  sqlQuery = sqlQuery.replace('IN (?)', `IN (${placeholders})`);

  const dateFrom = new Date(from * 1000).toISOString().split('T')[0];
  const dateTo = new Date(to * 1000).toISOString().split('T')[0];
  const params = [...projects, dateFrom, dateTo, dateFrom, dateTo];

  try {
    const [rows] = await pool.execute(sqlQuery, params);
    return rows as MetricItem[];
  } catch (error) {
    console.error('Database query failed:', error);
    throw error;
  }
}

export async function get_daily_df(
  pool: mysql.Pool,
  projects: string[],
  from: number,
  to: number,
): Promise<MetricItem[]> {
  const sqlFilePath = getSqlFilePath('df_daily.sql');
  let sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  const placeholders = projects.map(() => '?').join(', ');
  sqlQuery = sqlQuery.replace('IN (?)', `IN (${placeholders})`);

  const dateFrom = new Date(from * 1000).toISOString().split('T')[0];
  const dateTo = new Date(to * 1000).toISOString().split('T')[0];
  const params = [dateFrom, dateTo, ...projects, dateFrom, dateTo];

  try {
    const [rows] = await pool.execute(sqlQuery, params);
    return rows as MetricItem[];
  } catch (error) {
    console.error('Database query failed:', error);
    throw error;
  }
}

export async function get_monthly_df(
  pool: mysql.Pool,
  projects: string[],
  from: number,
  to: number,
): Promise<MetricItem[]> {
  const sqlFilePath = getSqlFilePath('df_monthly.sql');
  let sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  const placeholders = projects.map(() => '?').join(', ');
  sqlQuery = sqlQuery.replace('IN (?)', `IN (${placeholders})`);

  const dateFrom = new Date(from * 1000).toISOString().split('T')[0];
  const dateTo = new Date(to * 1000).toISOString().split('T')[0];
  const params = [...projects, dateFrom, dateTo, dateFrom, dateTo];

  try {
    const [rows] = await pool.execute(sqlQuery, params);
    return rows as MetricItem[];
  } catch (error) {
    console.error('Database query failed:', error);
    throw error;
  }
}

export async function get_daily_mltc(
  pool: mysql.Pool,
  projects: string[],
  from: number,
  to: number,
): Promise<MetricItem[]> {
  const sqlFilePath = getSqlFilePath('mltc_daily.sql');
  let sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  const placeholders = projects.map(() => '?').join(', ');
  sqlQuery = sqlQuery.replace('IN (?)', `IN (${placeholders})`);

  const dateFrom = new Date(from * 1000).toISOString().split('T')[0];
  const dateTo = new Date(to * 1000).toISOString().split('T')[0];
  const params = [dateFrom, dateTo, ...projects, dateFrom, dateTo];

  try {
    const [rows] = await pool.execute(sqlQuery, params);
    return rows as MetricItem[];
  } catch (error) {
    console.error('Database query failed:', error);
    throw error;
  }
}

export async function get_monthly_mltc(
  pool: mysql.Pool,
  projects: string[],
  from: number,
  to: number,
): Promise<MetricItem[]> {
  const sqlFilePath = getSqlFilePath('mltc_monthly.sql');
  let sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  const placeholders = projects.map(() => '?').join(', ');
  sqlQuery = sqlQuery.replace('IN (?)', `IN (${placeholders})`);

  const dateFrom = new Date(from * 1000).toISOString().split('T')[0];
  const dateTo = new Date(to * 1000).toISOString().split('T')[0];
  const params = [...projects, dateFrom, dateTo, dateFrom, dateTo];

  try {
    const [rows] = await pool.execute(sqlQuery, params);
    return rows as MetricItem[];
  } catch (error) {
    console.error('Database query failed:', error);
    throw error;
  }
}

export async function get_daily_mttr(
  pool: mysql.Pool,
  projects: string[],
  from: number,
  to: number,
): Promise<MetricItem[]> {
  const sqlFilePath = getSqlFilePath('mttr_daily.sql');
  let sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  const placeholders = projects.map(() => '?').join(', ');
  sqlQuery = sqlQuery.replace('IN (?)', `IN (${placeholders})`);

  const dateFrom = new Date(from * 1000).toISOString().split('T')[0];
  const dateTo = new Date(to * 1000).toISOString().split('T')[0];
  const params = [dateFrom, dateTo, ...projects, dateFrom, dateTo];

  try {
    const [rows] = await pool.execute(sqlQuery, params);
    return rows as MetricItem[];
  } catch (error) {
    console.error('Database query failed:', error);
    throw error;
  }
}

export async function get_monthly_mttr(
  pool: mysql.Pool,
  projects: string[],
  from: number,
  to: number,
): Promise<MetricItem[]> {
  const sqlFilePath = getSqlFilePath('mttr_monthly.sql');
  let sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  const placeholders = projects.map(() => '?').join(', ');
  sqlQuery = sqlQuery.replace('IN (?)', `IN (${placeholders})`);

  const dateFrom = new Date(from * 1000).toISOString().split('T')[0];
  const dateTo = new Date(to * 1000).toISOString().split('T')[0];
  const params = [...projects, dateFrom, dateTo, dateFrom, dateTo];

  try {
    const [rows] = await pool.execute(sqlQuery, params);
    return rows as MetricItem[];
  } catch (error) {
    console.error('Database query failed:', error);
    throw error;
  }
}

/**
 * Creates and initializes the DORA metrics service
 * 
 * This factory function sets up the DORA service with database connections and
 * implements the DoraService interface for metric retrieval.
 * 
 * @param options - Configuration options
 * @param options.logger - Logger service for recording events
 * @param options.config - Backstage configuration containing database settings
 * @returns Promise resolving to an initialized DoraService instance
 */
export async function createDoraService({
  logger,
  config,
}: {
  logger: LoggerService;
  config: Config;
}): Promise<DoraService> {
  logger.info('Initializing DoraService');
  
  // Extract database configuration from Backstage config
  const dbConfig: DbConfig = {
    host: config.getString('dora.db.host'),
    port: config.getOptionalNumber('dora.db.port') ?? 3306,
    user: config.getString('dora.db.user'),
    password: config.getString('dora.db.password'),
    database: config.getString('dora.db.database'),
  };

  // Create a connection pool to the database
  const pool = createDbPool(dbConfig);

  // Return the DoraService implementation
  return {
    /**
     * Retrieves DORA metrics for specified projects, metric type, and time range
     * 
     * @param type - Type of DORA metric to retrieve (df, mltc, cfr, mttr)
     * @param aggregation - Time aggregation level (daily or monthly)
     * @param projects - Array of project names to filter by
     * @param from - Start timestamp (seconds since epoch)
     * @param to - End timestamp (seconds since epoch)
     * @returns Promise resolving to an array of metric items
     * @throws Error if the metric type or aggregation is not supported
     */
    async getMetric(
      type: MetricType,
      aggregation: Aggregation,
      projects: string[],
      from: number,
      to: number,
    ) {
      // Route the request to the appropriate function based on metric type and aggregation
      switch (type) {
        case 'df': // Deployment Frequency
          if (aggregation === 'daily') {
            return get_daily_df(pool, projects, from, to);
          } else if (aggregation === 'monthly') {
            return get_monthly_df(pool, projects, from, to);
          }
          break;
        case 'mltc': // Mean Lead Time for Changes
          if (aggregation === 'daily') {
            return get_daily_mltc(pool, projects, from, to);
          } else if (aggregation === 'monthly') {
            return get_monthly_mltc(pool, projects, from, to);
          }
          break;
        case 'cfr': // Change Failure Rate
          if (aggregation === 'daily') {
            return get_daily_cfr(pool, projects, from, to);
          } else if (aggregation === 'monthly') {
            return get_monthly_cfr(pool, projects, from, to);
          }
          break;
        case 'mttr': // Mean Time to Restore
          if (aggregation === 'daily') {
            return get_daily_mttr(pool, projects, from, to);
          } else if (aggregation === 'monthly') {
            return get_monthly_mttr(pool, projects, from, to);
          }
          break;
        default:
          throw new Error(`Unsupported DORA metric type: ${type}`);
      }

      throw new Error(`Unsupported aggregation: ${aggregation}`);
    },

    /**
     * Retrieves a list of all available project names from the database
     * 
     * @returns Promise resolving to an array of project names
     * @throws Error if database query fails
     */
    async getProjectNames(): Promise<string[]> {
      const sqlQuery = 'SELECT DISTINCT name FROM projects';
      try {
        // Execute query to get distinct project names
        const [rows] = await pool.execute(sqlQuery);
        return (rows as Array<{ name: string }>).map(row => row.name);
      } catch (error) {
        // Log the error with proper error handling
        logger.error(
          'Error fetching project names',
          error instanceof Error ? error : new Error(String(error)),
        );
        throw error;
      }
    },
  };
}
