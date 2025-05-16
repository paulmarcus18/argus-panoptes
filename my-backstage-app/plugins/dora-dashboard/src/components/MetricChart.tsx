import React from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { Typography, Box, Paper } from '@mui/material';

type MetricChartProps = {
  title: string;
  description?: string;
  data: { label: string; value: number }[];
  color?: string;
};

export const MetricChart = ({
  title,
  description,
  data,
  color = '#00e5ff',
}: MetricChartProps) => {
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

      <Box sx={{ flex: 1 }}>
        <BarChart
          xAxis={[
            {
              data: xLabels,
              scaleType: 'band',
              label: 'Date Range',
              categoryGapRatio: 0.3,
              barGapRatio: 0.2,
            },
          ]}
          yAxis={[{ label: 'Value' }]}
          series={[
            {
              data: chartData,
              color,

              valueFormatter: (value: number | null) => {
                if (value == null || isNaN(value)) return 'N/A';
                return title === 'Change Failure Rate'
                  ? `${(value * 100).toFixed(1)}%`
                  : value.toFixed(1);
              },
            },
          ]}
          margin={{ top: 10, right: 20, bottom: 40, left: 50 }}
        />
      </Box>
    </Paper>
  );
};
