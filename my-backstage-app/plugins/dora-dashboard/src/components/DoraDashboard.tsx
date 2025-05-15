import React, { useState } from 'react';
import {
  Grid,
  MenuItem,
  Select,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Paper,
} from '@material-ui/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Progress, ResponseErrorPanel } from '@backstage/core-components';
import { useMetricsData } from './ExampleFetchComponent/ExampleFetchComponent';

// Define types for our metrics
type MetricType = {
  id: string;
  label: string;
  description: string;
  color: string;
};

// DORA Metrics types with descriptions and colors
const METRIC_TYPES: MetricType[] = [
  {
    id: 'df_average',
    label: 'Deployment Frequency',
    description: 'How often code is deployed to production',
    color: '#4caf50', // green
  },
  {
    id: 'mltc',
    label: 'Lead Time for Changes',
    description: 'Time it takes for code to go from commit to production',
    color: '#2196f3', // blue
  },
  {
    id: 'cfr',
    label: 'Change Failure Rate',
    description: 'Percentage of deployments causing a failure in production',
    color: '#f44336', // red
  },
  {
    id: 'mttr',
    label: 'Time to Restore Service',
    description: 'How long it takes to recover from failures',
    color: '#ff9800', // orange
  },
];

// Chart component for a single metric
const MetricChart = ({
  title,
  description,
  data,
  color,
}: {
  title: string;
  description: string;
  data: Array<{ key: string; value: number }>;
  color: string;
}) => (
  <Paper style={{ padding: 16, height: '100%' }}>
    <Typography variant="h6" style={{ marginBottom: 8 }}>
      {title}
    </Typography>
    <Typography
      variant="body2"
      color="textSecondary"
      style={{ marginBottom: 16 }}
    >
      {description}
    </Typography>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
        <XAxis dataKey="key" />
        <YAxis />
        <Tooltip
          formatter={(value: number, name: string) => {
            // Format CFR as percentage
            if (title === 'Change Failure Rate') {
              return [`${(value * 100).toFixed(1)}%`, 'Value'];
            }
            return [value.toFixed(1), 'Value'];
          }}
        />
        <Bar dataKey="value" fill={color} />
      </BarChart>
    </ResponsiveContainer>
  </Paper>
);

// Main DORA Dashboard component
export const DoraDashboard = () => {
  const [timeUnit, setTimeUnit] = useState<'weekly' | 'monthly'>('weekly');

  const { value: metricsData, loading, error } = useMetricsData(timeUnit);

  const handleTimeUnitChange = (
    event: React.ChangeEvent<{ value: unknown }>,
  ) => {
    setTimeUnit(event.target.value as 'weekly' | 'monthly');
  };

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4">DORA Metrics</Typography>
        <FormControl variant="outlined" style={{ minWidth: 120 }}>
          <InputLabel id="time-unit-label">Time Period</InputLabel>
          <Select
            labelId="time-unit-label"
            id="time-unit-select"
            value={timeUnit}
            onChange={handleTimeUnitChange}
            label="Time Period"
          >
            <MenuItem value="weekly">Weekly</MenuItem>
            <MenuItem value="monthly">Monthly</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {METRIC_TYPES.map(metric => {
          // Find the metric data
          const metricData = metricsData?.find(m => m.id === metric.id);
          return (
            <Grid item xs={12} md={6} key={metric.id}>
              <MetricChart
                title={metric.label}
                description={metric.description}
                data={metricData?.dataPoints || []}
                color={metric.color}
              />
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};
