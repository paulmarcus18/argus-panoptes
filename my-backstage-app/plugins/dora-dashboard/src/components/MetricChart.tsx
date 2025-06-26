import { BarChart } from '@mui/x-charts/BarChart';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';

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

  // Determine Y-axis configuration based on chart type
  const getYAxisConfig = () => {
    switch (title) {
      case 'Deployment Frequency':
        return {
          label: '',
          tickLabelStyle: { fontSize: 10 },
          valueFormatter: (value: number) => value.toString(),
        };
      case 'Lead Time for Changes':
      case 'Time to Restore Service':
        return {
          label: 'Hours',
          tickLabelStyle: { fontSize: 10 },
          valueFormatter: (value: number) => value.toString(),
        };
      case 'Change Failure Rate':
        return {
          label: '',
          tickLabelStyle: { fontSize: 10 },
          valueFormatter: (value: number) => `${(value * 100).toFixed(0)}%`,
        };
      default:
        return {
          label: 'Value',
          tickLabelStyle: { fontSize: 10 },
          valueFormatter: (value: number) => value.toString(),
        };
    }
  };

  // Format data labels on bars
  const formatDataLabel = (value: number) => {
    switch (title) {
      case 'Deployment Frequency':
        return value.toString();
      case 'Lead Time for Changes':
      case 'Time to Restore Service':
        return value.toFixed(1);
      case 'Change Failure Rate':
        return `${(value * 100).toFixed(1)}%`;
      default:
        return value.toFixed(1);
    }
  };

  const yAxisConfig = getYAxisConfig();

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
              label: yAxisConfig.label,
              tickLabelStyle: yAxisConfig.tickLabelStyle,
              valueFormatter: yAxisConfig.valueFormatter,
            },
          ]}
          margin={{ top: 30, left: 50, bottom: 26, right: 4 }}
          grid={{ horizontal: true }}
          series={[
            {
              data: chartData,
              color,
              valueFormatter: (value: number | null) => {
                const numericValue = Number(value);
                if (isNaN(numericValue)) return 'N/A';
                return formatDataLabel(numericValue);
              },
            },
          ]}
        />
      </Box>
    </Paper>
  );
};
