import {
  Table,
  TableColumn,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import useAsync from 'react-use/lib/useAsync';

type MetricRow = {
  key: string;
  [metricType: string]: string | number;
};

const METRIC_TYPES = [
  { id: 'df_average',   label: 'Deploy Freq Avg' },
  { id: 'mltc',         label: 'Lead Time Median' },
  { id: 'cfr',          label: 'Change Failure Rate' },
  { id: 'mttr',  label: 'Time to Restore' },
];

export const ExampleFetchComponent = () => {
  const { value, loading, error } = useAsync(async (): Promise<MetricRow[]> => {
    const responses = await Promise.all(
      METRIC_TYPES.map(m =>
        fetch(
          `http://localhost:10666/dora/api/metric?type=${m.id}&aggregation=weekly`,
        ).then(res => {
          if (!res.ok) throw new Error(res.statusText);
          return res.json();
        }),
      ),
    ); // 

    const metricMaps = responses.map((json: any) => {
      const map: Record<string, number> = {};
      for (const dp of json.dataPoints) {
        map[dp.key] = dp.value;
      }
      return map;
    });

    const allKeys = new Set<string>();
    for (const m of metricMaps) {
      Object.keys(m).forEach(k => allKeys.add(k));
    }

    return Array.from(allKeys).map(key => {
      const row: MetricRow = { key };
      metricMaps.forEach((m, i) => {
        row[METRIC_TYPES[i].label] = m[key] ?? 0;
      });
      return row;
    });
  }, []);

  if (loading) {
    return <Progress />;  
  }
  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  const columns: TableColumn[] = [
    { title: 'Period', field: 'key', cellStyle: { minWidth: 200 } },
    ...METRIC_TYPES.map(m => ({
      title: m.label,
      field: m.label,
      cellStyle: { minWidth: 120 },
      render: (row: any) => {
        const v = row[m.label] as number;
        const formatted =
          m.id === 'cfr'
            ? `${(v * 100).toFixed(1)}%`
            : v.toFixed(1);
        return formatted;
      },
    })),
  ];

  return <Table title="Weekly dora metrics" options={{ search: false, paging: false }} columns={columns} data={value || []} />;
};
