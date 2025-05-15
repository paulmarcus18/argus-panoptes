import useAsync from 'react-use/lib/useAsync';

type DataPoint = {
  key: string;
  value: number;
};

type MetricData = {
  id: string;
  dataPoints: DataPoint[];
};

// The four DORA metrics
const METRIC_TYPES = [
  { id: 'df_average', label: 'Deploy Freq Avg' },
  { id: 'mltc', label: 'Lead Time Median' },
  { id: 'cfr', label: 'Change Failure Rate' },
  { id: 'mttr', label: 'Time to Restore' },
];

/**
 * Custom hook to fetch all DORA metrics data
 * @param aggregation - The time aggregation to use ('weekly' or 'monthly')
 * @returns The metrics data, loading state, and any error
 */
export function useMetricsData(aggregation: 'weekly' | 'monthly' = 'weekly') {
  return useAsync(async (): Promise<MetricData[]> => {
    const responses = await Promise.all(
      METRIC_TYPES.map(m =>
        fetch(
          `http://localhost:10666/dora/api/metric?type=${m.id}&aggregation=${aggregation}`,
        ).then(res => {
          if (!res.ok) throw new Error(res.statusText);
          return res.json();
        }),
      ),
    );

    // Format the responses with their metric ID
    return responses.map((json: any, index) => ({
      id: METRIC_TYPES[index].id,
      dataPoints: json.dataPoints || [],
    }));
  }, [aggregation]);
}

/**
 * Legacy component that uses the metrics data to render a table
 * Kept for backward compatibility
 */
export const ExampleFetchComponent = () => {
  const { value, loading, error } = useMetricsData();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  // Convert the data to the format expected by the original component
  const metricMaps = (value || []).map(metric => {
    const map: Record<string, number> = {};
    for (const dp of metric.dataPoints) {
      map[dp.key] = dp.value;
    }
    return map;
  });

  const allKeys = new Set<string>();
  for (const m of metricMaps) {
    Object.keys(m).forEach(k => allKeys.add(k));
  }

  // Create rows with all metrics for each time period
  const rows = Array.from(allKeys).map(key => {
    const row: { key: string; [metricType: string]: string | number } = { key };
    metricMaps.forEach((m, i) => {
      row[METRIC_TYPES[i].label] = m[key] ?? 0;
    });
    return row;
  });

  // Just a placeholder table to maintain the original interface
  return (
    <div>
      <p>
        This component is deprecated. Please use the DoraDashboard component
        instead.
      </p>
    </div>
  );
};
