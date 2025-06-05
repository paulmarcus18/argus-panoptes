import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { createDbPool, DbConfig } from './db';
import mysql from 'mysql2/promise'; // Needed to type the pool

import { MetricItem, DoraService, MetricType, Aggregation } from './types';

import fs from 'fs';
import path from 'path';


export async function get_monthly_cfr(
  pool: mysql.Pool,
  projects: string[],
  from: number,
  to: number
): Promise<MetricItem[]> {
  const sqlFilePath = path.join(__dirname, 'queries/cfr_monthly.sql');
  let sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  const placeholders = projects.map(() => '?').join(', ');
  sqlQuery = sqlQuery.replace('IN (?)', `IN (${placeholders})`);

  // TODO: adauga projects dupa ce schimbi slq queryul
  const params = ['2025-01-01', '2025-06-30', '2025-01-01', '2025-06-30'];

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
  to: number
): Promise<MetricItem[]> {
  const sqlFilePath = path.join(__dirname, 'queries/df_monthly.sql');
  let sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  // Dynamically inject (?, ?, ?) based on number of projects
  const placeholders = projects.map(() => '?').join(', ');
  sqlQuery = sqlQuery.replace('IN (?)', `IN (${placeholders})`);

  // Convert the Unix timestamp to YYYY-MM-DD format
  const dateFrom = new Date(from).toISOString().split('T')[0];
  const dateTo = new Date(to).toISOString().split('T')[0];

  // Static date range for now (same as what you used in Grafana)
  // const params = [...projects, dateFrom, dateTo, dateFrom, dateTo];
  const params = [...projects, '2025-01-01', '2025-06-30', '2025-01-01', '2025-06-30'];


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
  to: number
): Promise<MetricItem[]> {
  const sqlFilePath = path.join(__dirname, 'queries/mltc_monthly.sql');
  let sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  // Dynamically inject (?, ?, ...) based on the number of projects
  const placeholders = projects.map(() => '?').join(', ');
  sqlQuery = sqlQuery.replace('IN (?)', `IN (${placeholders})`);

  const params = [...projects, '2025-01-01', '2025-06-30', '2025-01-01', '2025-06-30'];

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
  to: number
): Promise<MetricItem[]> {
  const sqlFilePath = path.join(__dirname, 'queries/mttr_monthly.sql');
  const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  // TODO: adauga projects dupa ce schimbi slq queryul
  const params = ['2025-01-01', '2025-06-30', '2025-01-01', '2025-06-30'];

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

  const pool = createDbPool(dbConfig)


  return {
    
    async getMetric(
      type: MetricType,
      aggregation: Aggregation,
      projects: string[],
      from: number,
      to: number
    ) {
        switch (type) {
            case 'df':
              if (aggregation === 'daily') {
                //return get_daily_df(pool, from, to)
              } else if (aggregation === 'monthly') {
                return get_monthly_df(pool, projects, from, to)
              }
              break;
            case 'mltc':
              if (aggregation === 'daily') {
                //return get_daily_mltc(pool, project, from, to)
              } else if (aggregation === 'monthly') {
                return get_monthly_mltc(pool, projects, from, to)
              }
              break;
            case 'cfr':
              if (aggregation === 'daily') {
                //return get_daily_cfr(pool, project, from, to)
              } else if (aggregation === 'monthly') {
                return get_monthly_cfr(pool, projects, from, to)
              }
              break;
            case 'mttr':
              if (aggregation === 'daily') {
                //return get_daily_mttr(pool, project, from, to)
              } else if (aggregation === 'monthly') {
                return get_monthly_mttr(pool, projects, from, to)
              }
              break;
          }
        
          throw new Error(`Unsupported aggregation: ${aggregation}`);
        }

  };
}