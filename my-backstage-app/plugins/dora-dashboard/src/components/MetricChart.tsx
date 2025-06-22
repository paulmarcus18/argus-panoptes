import { BarChart } from '@mui/x-charts/BarChart';
import { Typography, Box, Paper } from '@mui/material';

export type MetricChartProps = {
  title: string;
  description?: string;
  data: { label: string; value: number }[];
  color?: string;
};

// Shared formatter function (for both Y-axis and bars)
export const formatValue = (type: string, value: any): string => {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return 'N/A';
  }

  const num = Number(value);
  switch (type) {
    case 'cfr': // Change Failure Rate
      return `${(num * 100).toFixed(1)}%`;
    case 'mltc': // Lead Time for Changes
    case 'mttr': // Time to Restore Service
      return num.toFixed(1);
    case 'df': // Deployment Frequency
      return num.toString();
    default:
      return num.toFixed(1);
  }
};

// Get metric ID by title
const getMetricIdFromTitle = (title: string): string => {
  switch (title) {
    case 'Deployment Frequency':
      return 'df';
    case 'Lead Time for Changes':
      return 'mltc';
    case 'Time to Restore Service':
      return 'mttr';
    case 'Change Failure Rate':
      return 'cfr';
    default:
      return 'unknown';
  }
};

export const MetricChart = ({
  title,
  description,
  data,
  color = '#00e5ff',
}: MetricChartProps) => {
  const metricId = getMetricIdFromTitle(title);
  const chartData = data.map(item => item.value);
  const xLabels = data.map(item => item.label);

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        height: '100%',
        bgcolor: theme =>
          theme.palette.mode === 'dark' ? '#1e1e1e' : 'background.paper',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
        {title}
      </Typography>

      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
      )}

      <Box sx={{ flex: 1, height: '100%', px: 0.5, pt: 0.5 }}>
        <BarChart
          height={240}
          xAxis={[
            {
              data: xLabels,
              scaleType: 'band',
              label: 'Date Range',
              tickLabelStyle: { fontSize: 10 },
            },
          ]}
          yAxis={[
            {
              label:
                metricId === 'mltc' || metricId === 'mttr'
                  ? 'Hours'
                  : metricId === 'unknown'
                  ? 'Value'
                  : '',
              tickLabelStyle: { fontSize: 10 },
              valueFormatter: (val: any) => formatValue(metricId, val),
            },
          ]}
          margin={{ top: 30, left: 50, bottom: 26, right: 4 }}
          grid={{ horizontal: true }}
          series={[
            {
              data: chartData,
              color,
              valueFormatter: (val: any) => formatValue(metricId, val),
            },
          ]}
        />
      </Box>
    </Paper>
  );
};
