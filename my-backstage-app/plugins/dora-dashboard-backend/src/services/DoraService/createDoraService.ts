import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { createDbPool, DbConfig } from './db';
import mysql from 'mysql2/promise'; // Needed to type the pool

import { MetricItem, DoraService, MetricType, Aggregation } from './types';

import fs from 'fs';
import path from 'path';

export async function get_monthly_cfr(pool: mysql.Pool, project:string, from: number, to: number): Promise<MetricItem[]> {
  const sqlFilePath = path.join(__dirname, 'queries/cfr_monthly.sql');
  const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  const params = [project, project, from, to];
  
  

  try {
    const [rows] = await pool.execute(sqlQuery, params);
    return rows as MetricItem[];
  } catch (error) {
    console.error('Database query failed:', error);
    throw error;
  }
  }


export async function get_weekly_cfr(pool: mysql.Pool, project:string, from: number, to: number): Promise<MetricItem[]> {
  const sqlFilePath = path.join(__dirname, 'queries/cfr_weekly.sql');
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


export async function get_monthly_df(pool: mysql.Pool, project: string, from: number, to: number): Promise<MetricItem[]> {
  
  const sqlFilePath = path.join(__dirname, 'queries/df_monthly.sql');
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


export async function get_weekly_df(pool: mysql.Pool, project:string, from: number, to: number): Promise<MetricItem[]> {
  const sqlFilePath = path.join(__dirname, 'queries/df_weekly.sql');
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

export async function get_monthly_mltc(pool: mysql.Pool, project:string, from: number, to: number): Promise<MetricItem[]> {
  const sqlFilePath = path.join(__dirname, 'queries/mltc_monthly.sql');
  const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  const params = [project, project, from, to, from, to];

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


export async function get_monthly_mttr(pool: mysql.Pool, project:string, from: number, to: number): Promise<MetricItem[]> {
  const sqlFilePath = path.join(__dirname, 'queries/mttr_monthly.sql');
  const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  const params = [project, project, from, to];

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
      project: string,
      from: number,
      to: number
    ) {
        switch (type) {
            case 'df':
              if (aggregation === 'weekly') {
                return get_weekly_df(pool, project, from, to)
              } else if (aggregation === 'monthly') {
                return get_monthly_df(pool, project, from, to)
              }
              break;
            case 'mltc':
              if (aggregation === 'weekly') {
                return get_weekly_mltc(pool, project, from, to)
              } else if (aggregation === 'monthly') {
                return get_monthly_mltc(pool, project, from, to)
              }
              break;
            case 'cfr':
              if (aggregation === 'weekly') {
                return get_weekly_cfr(pool, project, from, to)
              } else if (aggregation === 'monthly') {
                return get_monthly_cfr(pool, project, from, to)
              }
              break;
            case 'mttr':
              if (aggregation === 'weekly') {
                return get_weekly_mttr(pool, project, from, to)
              } else if (aggregation === 'monthly') {
                return get_monthly_mttr(pool, project, from, to)
              }
              break;
          }
        
          throw new Error(`Unsupported aggregation: ${aggregation}`);
        }

  };
}