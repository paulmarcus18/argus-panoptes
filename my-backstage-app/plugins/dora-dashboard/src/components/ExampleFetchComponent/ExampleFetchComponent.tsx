import React from 'react';
import useAsync from 'react-use/lib/useAsync';

// ------------------ Types ------------------

export type DataPoint = {
  key: string;
  value: number;
  date?: Date;
};

export type MetricData = {
  id: string;
  dataPoints: DataPoint[];
};

const METRIC_TYPES = [
  { id: 'df', label: 'Deploy Freq Avg' },
  { id: 'mltc', label: 'Lead Time Median' },
  { id: 'cfr', label: 'Change Failure Rate' },
  { id: 'mttr', label: 'Time to Restore' },
];

// ------------------ Hook ------------------

export function useMetricsData(
  aggregation: 'weekly' | 'monthly' = 'weekly',
  startDate?: Date,
  endDate?: Date,
) {
  return useAsync(async (): Promise<MetricData[]> => {
    const baseUrl = 'http://localhost:7007/api/dora-dashboard/metrics';
    const group = '_'; // fallback group for all teams

    const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const defaultEnd = new Date();

    const start = startDate ?? defaultStart;
    const end = endDate ?? defaultEnd;

    const startTimestamp = Math.floor(start.getTime() / 1000);
    const endTimestamp = Math.floor(end.getTime() / 1000);

    const results = await Promise.all(
      METRIC_TYPES.map(async metric => {
        const url = `${baseUrl}/${metric.id}/${aggregation}/${group}/${startTimestamp}/${endTimestamp}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch ${metric.label}: ${response.statusText}`,
          );
        }

        const json = await response.json();
        const dataPoints: DataPoint[] = (json || []).map((dp: any) => ({
          key: dp.data_key,
          value: dp.data_value,
          date: new Date(),
        }));

        return {
          id: metric.id,
          dataPoints,
        };
      }),
    );
console.log('Fetched metrics:', results);
    return results;
    
  }, [aggregation, startDate?.getTime(), endDate?.getTime()]);
}

// ------------------ Debug Component ------------------

export const ExampleFetchComponent = () => {
  const { value, loading, error } = useMetricsData();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const allKeys = new Set<string>();
  const metricMaps = (value || []).map(metric => {
    const map: Record<string, number> = {};
    for (const dp of metric.dataPoints) {
      map[dp.key] = dp.value;
      allKeys.add(dp.key);
    }
    return map;
  });

  const rows = Array.from(allKeys).map(key => {
    const row: { key: string; [metric: string]: number | string } = { key };
    METRIC_TYPES.forEach((metric, i) => {
      row[metric.label] = metricMaps[i][key] ?? 0;
    });
    return row;
  });

  return (
    <div>
      <p>
        This component is for debug/testing. For visual charts, use{' '}
        <strong>DoraDashboard</strong>.
      </p>
      <pre>{JSON.stringify(rows, null, 2)}</pre>
    </div>
  );
};