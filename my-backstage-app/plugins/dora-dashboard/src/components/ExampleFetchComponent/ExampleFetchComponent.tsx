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
  { id: 'df_average', label: 'Deploy Freq Avg' },
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
    const baseUrl = 'http://localhost:10666/dora/api/metric';
    const queryParams = new URLSearchParams({ aggregation });

    if (startDate) {
      queryParams.append('startDate', startDate.toISOString().split('T')[0]);
    }

    if (endDate) {
      queryParams.append('endDate', endDate.toISOString().split('T')[0]);
    }

    const results = await Promise.all(
      METRIC_TYPES.map(async metric => {
        const url = `${baseUrl}?${queryParams.toString()}&type=${metric.id}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch ${metric.label}: ${response.statusText}`,
          );
        }

        const json = await response.json();
        const dataPoints: DataPoint[] = (json.dataPoints || []).map(
          (dp: any) => ({
            ...dp,
            date: new Date(dp.key),
          }),
        );

        return {
          id: metric.id,
          dataPoints,
        };
      }),
    );

    return results;
  }, [aggregation, startDate?.getTime(), endDate?.getTime()]);
}

// ------------------ Legacy Component ------------------

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
        This component is deprecated. Please use the{' '}
        <strong>DoraDashboard</strong> component instead.
      </p>
      <pre>{JSON.stringify(rows, null, 2)}</pre>
    </div>
  );
};
