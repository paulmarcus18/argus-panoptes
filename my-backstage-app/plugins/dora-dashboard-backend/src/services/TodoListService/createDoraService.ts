import { LoggerService } from '@backstage/backend-plugin-api';


import { MetricItem, DoraService, MetricType, Aggregation } from './types';
import e from 'express';

export async function get_monthly_cfr(): Promise<MetricItem[]> {
    return [
      { data_key: '2022/10', data_value: 29.5 },
      { data_key: '2022/11', data_value: 20.9 },
      { data_key: '2022/12', data_value: 30.1 },
      { data_key: '2023/01', data_value: 33.1 },
      { data_key: '2023/02', data_value: 18.7 },
      { data_key: '2023/03', data_value: 11.0 },
      { data_key: '2023/04', data_value: 29.0 },
      { data_key: '2023/05', data_value: 40.0 },
      { data_key: '2023/06', data_value: 8.5 },
    ];
  }

export async function get_weekly_cfr(): Promise<MetricItem[]> {
    return [
      { data_key: '07/08/2023 (Week 32)', data_value: 3 },
      { data_key: '14/08/2023 (Week 33)', data_value: 2 },
      { data_key: '21/08/2023 (Week 34)', data_value: 5 },
      { data_key: '28/08/2023 (Week 35)', data_value: 0 },
      { data_key: '04/09/2023 (Week 36)', data_value: 2 },
      { data_key: '11/09/2023 (Week 37)', data_value: 11 },
    ];
}


export async function get_monthly_df_average(): Promise<MetricItem[]> {
    return [
        { data_key: '2022/10', data_value: 36.37 },
        { data_key: '2022/11', data_value: 42 },
        { data_key: '2022/12', data_value: 18.95 },
        { data_key: '2023/01', data_value: 19.5 },
        { data_key: '2023/02', data_value: 32 },
        { data_key: '2023/03', data_value: 41.6 },
        { data_key: '2023/04', data_value: 38.3 },
        { data_key: '2023/05', data_value: 34.7 },
        { data_key: '2023/06', data_value: 37.3 },
    ];
}

export async function get_weekly_df_average(): Promise<MetricItem[]> {
  return [
       { data_key: '07/08/2023 (Week 32)', data_value: 4.37 },
       { data_key: '14/08/2023 (Week 33)', data_value: 6.25 },
       { data_key: '21/08/2023 (Week 34)', data_value: 4.2 },
       { data_key: '28/08/2023 (Week 35)', data_value: 3 },
       { data_key: '04/09/2023 (Week 36)', data_value: 3.5 },
       { data_key: '11/09/2023 (Week 37)', data_value: 5 },
    ];
}

export async function get_monthly_mttr(): Promise<MetricItem[]> {
    return [
      { data_key: '2022/10', data_value: 12 },
      { data_key: '2022/11', data_value: 8 },
      { data_key: '2022/12', data_value: 2 },
      { data_key: '2023/01', data_value: 17 },
      { data_key: '2023/02', data_value: 55 },
      { data_key: '2023/03', data_value: 42 },
      { data_key: '2023/04', data_value: 14 },
      { data_key: '2023/05', data_value: 32 },
      { data_key: '2023/06', data_value: 0 },
    ];
}

export async function get_weekly_mttr(): Promise<MetricItem[]> {
  return [
    { data_key: '07/08/2023 (Week 32)', data_value: 2 },
    { data_key: '14/08/2023 (Week 33)', data_value: 21.6 },
    { data_key: '21/08/2023 (Week 34)', data_value: 1 },
    { data_key: '28/08/2023 (Week 35)', data_value: 1.5 },
    { data_key: '04/09/2023 (Week 36)', data_value: 8 },
    { data_key: '11/09/2023 (Week 37)', data_value: 0 },
    ];
}


export async function createDoraService({
  logger,
}: {
  logger: LoggerService;
}): Promise<DoraService> {
  logger.info('Initializing DoraService');

  // should they be kept in an array???
  const storedMetrics = new Array<MetricItem>();

  return {
    
    async getMetric(
      type: MetricType,
      aggregation: Aggregation
    ) {
        switch (type) {
            case 'df_average':
              if (aggregation === 'weekly') {
                return get_weekly_df_average()
              } else if (aggregation === 'monthly') {
                return get_monthly_df_average() 
              }
              break;
            case 'lead_time':
              if (aggregation === 'weekly') {
                // mi-e lene
              } else if (aggregation === 'monthly') {
              }
              break;
            case 'change_failure_rate':
              if (aggregation === 'weekly') {
                return get_weekly_cfr()
              } else if (aggregation === 'monthly') {
                return get_monthly_cfr()
              }
              break;
            case 'time_to_restore':
              if (aggregation === 'weekly') {
                return get_weekly_mttr()
              } else if (aggregation === 'monthly') {
                return get_monthly_mttr()
              }
              break;
          }
        
          throw new Error(`Unsupported aggregation: ${aggregation}`);
        }

  };
}