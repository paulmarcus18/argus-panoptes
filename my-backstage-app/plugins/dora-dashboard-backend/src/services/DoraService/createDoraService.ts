import {
  LoggerService,
  resolvePackagePath,
} from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { createDbPool, DbConfig } from './db';
import mysql from 'mysql2/promise';
import { MetricItem, DoraService, MetricType, Aggregation } from './types';
import fs from 'fs';

const getSqlFilePath = (fileName: string): string => {
  return resolvePackagePath(
    '@internal/plugin-dora-dashboard-backend',
    'src/services/DoraService/queries',
    fileName,
  );
};

export async function get_daily_cfr(
  pool: mysql.Pool,
  projects: string[],
  from: number,
  to: number,
): Promise<MetricItem[]> {
  const sqlFilePath = getSqlFilePath('cfr_daily.sql');
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

export async function createDoraService({
  logger,
  config,
}: {
  logger: LoggerService;
  config: Config;
}): Promise<DoraService> {
  logger.info('Initializing DoraService');
  const dbConfig: DbConfig = {
    host: config.getString('dora.db.host'),
    port: config.getOptionalNumber('dora.db.port') ?? 3306,
    user: config.getString('dora.db.user'),
    password: config.getString('dora.db.password'),
    database: config.getString('dora.db.database'),
  };

  const pool = createDbPool(dbConfig);

  return {
    async getMetric(
      type: MetricType,
      aggregation: Aggregation,
      projects: string[],
      from: number,
      to: number,
    ) {
      switch (type) {
        case 'df':
          if (aggregation === 'daily') {
            return get_daily_df(pool, projects, from, to);
          } else if (aggregation === 'monthly') {
            return get_monthly_df(pool, projects, from, to);
          }
          break;
        case 'mltc':
          if (aggregation === 'daily') {
            return get_daily_mltc(pool, projects, from, to);
          } else if (aggregation === 'monthly') {
            return get_monthly_mltc(pool, projects, from, to);
          }
          break;
        case 'cfr':
          if (aggregation === 'daily') {
            return get_daily_cfr(pool, projects, from, to);
          } else if (aggregation === 'monthly') {
            return get_monthly_cfr(pool, projects, from, to);
          }
          break;
        case 'mttr':
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

    async getProjectNames(): Promise<string[]> {
      const sqlQuery = 'SELECT DISTINCT name FROM projects';
      try {
        const [rows] = await pool.execute(sqlQuery);
        return (rows as Array<{ name: string }>).map(row => row.name);
      } catch (error) {
        logger.error(
          'Error fetching project names',
          error instanceof Error ? error : new Error(String(error)),
        );
        throw error;
      }
    },
  };
}
