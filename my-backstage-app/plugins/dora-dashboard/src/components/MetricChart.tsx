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
              label: 'Value',
              tickLabelStyle: { fontSize: 10 },
            },
          ]}
          margin={{ top: 16, left: 35, bottom: 26, right: 4 }}
          grid={{ horizontal: true }}
          series={[
            {
              data: chartData,
              color,
              valueFormatter: (value: number | null) => {
                const numericValue = Number(value);
                if (isNaN(numericValue)) return 'N/A';
              
                return title === 'Change Failure Rate'
                  ? `${(numericValue * 100).toFixed(1)}%`
                  : numericValue.toFixed(1);
              },
            },
          ]}
        />
      </Box>
    </Paper>
  );
};
