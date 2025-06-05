import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { createDbPool, DbConfig } from './db';
import mysql from 'mysql2/promise'; // Needed to type the pool

import { MetricItem, DoraService, MetricType, Aggregation } from './types';

import fs from 'fs';
import path, { format } from 'path';
import { PanoramaSharp } from '@mui/icons-material';

export async function get_monthly_cfr(pool: mysql.Pool, from: number, to: number): Promise<MetricItem[]> {
  const sqlFilePath = path.join(__dirname, 'queries/cfr_monthly.sql');
  const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  const params = [ from, to];
  
  

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

  // Static date range for now (same as what you used in Grafana)
  const params = [...projects, '2025-01-01', '2025-06-30', '2025-01-01', '2025-06-30'];

  try {
    const [rows] = await pool.execute(sqlQuery, params);
    return rows as MetricItem[];
  } catch (error) {
    console.error('Database query failed:', error);
    throw error;
  }
}


export async function get_monthly_mltc(pool: mysql.Pool, from: number, to: number): Promise<MetricItem[]> {
  const sqlFilePath = path.join(__dirname, 'queries/mltc_monthly.sql');
  const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  const params = [from, to, from, to];

  try {
    const [rows] = await pool.execute(sqlQuery, params);
    return rows as MetricItem[];
  } catch (error) {
    console.error('Database query failed:', error);
    throw error;
  }
}


export async function get_weekly_mltc(pool: mysql.Pool, project: string, from: number, to: number): Promise<MetricItem[]> {
  const sqlFilePath = path.join(__dirname, 'queries/mltc_weekly.sql');
  const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  const params = [from, to, project, project, from, to];

  try {
    const [rows] = await pool.execute(sqlQuery, params);
    return rows as MetricItem[];
  } catch (error) {
    console.error('Database query failed:', error);
    throw error;
  }
}


export async function get_monthly_mttr(pool: mysql.Pool, from: number, to: number): Promise<MetricItem[]> {
  const sqlFilePath = path.join(__dirname, 'queries/mttr_monthly.sql');
  const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  const params = [from, to];

  try {
    const [rows] = await pool.execute(sqlQuery, params);
    return rows as MetricItem[];
  } catch (error) {
    console.error('Database query failed:', error);
    throw error;
  }
}


export async function get_weekly_mttr(pool: mysql.Pool, project: string, from: number, to: number): Promise<MetricItem[]> {
  const sqlFilePath = path.join(__dirname, 'queries/mttr_weekly.sql');
  const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  const params = [from, to, project, project];

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
              if (aggregation === 'weekly') {
                //return get_weekly_df(pool, from, to)
              } else if (aggregation === 'monthly') {
                return get_monthly_df(pool, ["project1","Demo","dora_metrics"], from, to)
              }
              break;
            case 'mltc':
              if (aggregation === 'weekly') {
                //return get_weekly_mltc(pool, project, from, to)
              } else if (aggregation === 'monthly') {
                return get_monthly_mltc(pool, from, to)
              }
              break;
            case 'cfr':
              if (aggregation === 'weekly') {
                //return get_weekly_cfr(pool, project, from, to)
              } else if (aggregation === 'monthly') {
                return get_monthly_cfr(pool, from, to)
              }
              break;
            case 'mttr':
              if (aggregation === 'weekly') {
                //return get_weekly_mttr(pool, project, from, to)
              } else if (aggregation === 'monthly') {
                return get_monthly_mttr(pool, from, to)
              }
              break;
          }
        
          throw new Error(`Unsupported aggregation: ${aggregation}`);
        }

  };
}