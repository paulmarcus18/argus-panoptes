import React from 'react';
import {
  Table,
  TableColumn,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import useAsync from 'react-use/lib/useAsync';

type Metric = {
  service: string;
  leadTimeDays: number;
  deployFrequency: number;
  changeFailureRate: number;
  timeToRestoreHours: number;
};

type MetricsTableProps = {
  data: Metric[];
};

/**
 * Renders a table of DORA metrics for a set of services.
 */
export const MetricsTable = ({ data }: MetricsTableProps) => {
  const columns: TableColumn[] = [
    { title: 'Service', field: 'service', cellStyle: { minWidth: 120 } },
    { title: 'Lead Time (days)', field: 'leadTimeDays', cellStyle: { minWidth: 120 } },
    { title: 'Deploy Frequency (/week)', field: 'deployFrequency', cellStyle: { minWidth: 150 } },
    {
      title: 'Failure Rate (%)',
      field: 'changeFailureRate',
      cellStyle: { minWidth: 120 },
    },
    { title: 'Time to Restore (hrs)', field: 'timeToRestoreHours', cellStyle: { minWidth: 140 } },
  ];

  const tableData = data.map(metric => ({
    service: metric.service,
    leadTimeDays: metric.leadTimeDays.toFixed(1),
    deployFrequency: metric.deployFrequency.toFixed(1),
    changeFailureRate: metric.changeFailureRate,
    timeToRestoreHours: metric.timeToRestoreHours.toFixed(1),
  }));

  return (
    <Table
      title="DORA Metrics Overview"
      options={{ search: false, paging: false }}
      columns={columns}
      data={tableData}
    />
  );
};

/**
 * Generates an array of random metrics for demonstration.
 */
function generateRandomMetrics(count: number): Metric[] {
  const services = [
    'auth-service',
    'checkout-service',
    'inventory-service',
    'payment-gateway',
    'notification-service',
    'user-profile',
    'analytics-engine',
    'recommendation-api',
  ];

  return Array.from({ length: count }).map((_, idx) => ({
    service: services[idx % services.length],
    leadTimeDays: Math.random() * 10 + 1,
    deployFrequency: Math.random() * 7 + 0.5,
    changeFailureRate: Math.random() * 15 + 1,
    timeToRestoreHours: Math.random() * 24 + 1,
  }));
}

export const ExampleFetchComponent = () => {
  const { value, loading, error } = useAsync(async (): Promise<Metric[]> => {
    const response = await fetch('http://localhost:10666/dora/api/metric?type=df_average&aggregation=weekly');
    if (!response.ok) {
      throw new Error(`Error fetching metrics: ${response.statusText}`);
    }
    const data = await response.json();

    // Transform the API response to match the Metric type
    const metrics: Metric[] = data.dataPoints.map((dp: any) => ({
      service: dp.service || 'unknown',
      leadTimeDays: dp.leadTimeDays || 0,
      deployFrequency: dp.deployFrequency || 0,
      changeFailureRate: dp.changeFailureRate || 0,
      timeToRestoreHours: dp.timeToRestoreHours || 0,
    }));

    return metrics;
  }, []);

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  return <MetricsTable data={value || []} />;
};



// return generateRandomMetrics(10);