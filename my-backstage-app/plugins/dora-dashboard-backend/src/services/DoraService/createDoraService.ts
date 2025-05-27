import { LoggerService } from '@backstage/backend-plugin-api';

import pool from './db';
import { MetricItem, DoraService, MetricType, Aggregation } from './types';

import fs from 'fs';
import path from 'path';


export async function get_monthly_cfr(project:string, from: number, to: number): Promise<MetricItem[]> {
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


export async function get_weekly_cfr(project:string, from: number, to: number): Promise<MetricItem[]> {
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


export async function get_monthly_df(project: string, from: number, to: number): Promise<MetricItem[]> {
  
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


export async function get_weekly_df(project:string, from: number, to: number): Promise<MetricItem[]> {
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

export async function get_monthly_mltc(project:string, from: number, to: number): Promise<MetricItem[]> {
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


export async function get_weekly_mltc(project: string, from: number, to: number): Promise<MetricItem[]> {
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


export async function get_monthly_mttr(project:string, from: number, to: number): Promise<MetricItem[]> {
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


export async function get_weekly_mttr(project: string, from: number, to: number): Promise<MetricItem[]> {
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
}: {
  logger: LoggerService;
}): Promise<DoraService> {
  logger.info('Initializing DoraService');

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
                return get_weekly_df(project, from, to)
              } else if (aggregation === 'monthly') {
                return get_monthly_df(project, from, to)
              }
              break;
            case 'mltc':
              if (aggregation === 'weekly') {
                return get_weekly_mltc(project, from, to)
              } else if (aggregation === 'monthly') {
                return get_monthly_mltc(project, from, to)
              }
              break;
            case 'cfr':
              if (aggregation === 'weekly') {
                return get_weekly_cfr(project, from, to)
              } else if (aggregation === 'monthly') {
                return get_monthly_cfr(project, from, to)
              }
              break;
            case 'mttr':
              if (aggregation === 'weekly') {
                return get_weekly_mttr(project, from, to)
              } else if (aggregation === 'monthly') {
                return get_monthly_mttr(project, from, to)
              }
              break;
          }
        
          throw new Error(`Unsupported aggregation: ${aggregation}`);
        }

  };
}