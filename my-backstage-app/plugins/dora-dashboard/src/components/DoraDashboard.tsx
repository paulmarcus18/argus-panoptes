import React, { useState, useEffect } from 'react';
import {
  Grid,
  MenuItem,
  Select,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Paper,
  FormControlLabel,
  Switch,
  Button,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Progress, ResponseErrorPanel } from '@backstage/core-components';
import { useMetricsData } from './ExampleFetchComponent/ExampleFetchComponent';
import { MetricChart } from './MetricChart';
import { SelectChangeEvent } from '@mui/material';

// Metric types
type MetricType = {
  id: string;
  label: string;
  description: string;
  color: string;
};

const METRIC_TYPES: MetricType[] = [
  {
    id: 'df',
    label: 'Deployment Frequency',
    description: 'How often code is deployed to production',
    color: '#4caf50',
  },
  {
    id: 'mltc',
    label: 'Lead Time for Changes',
    description: 'Time it takes for code to go from commit to production',
    color: '#2196f3',
  },
  {
    id: 'cfr',
    label: 'Change Failure Rate',
    description: 'Percentage of deployments causing a failure in production',
    color: '#f44336',
  },
  {
    id: 'mttr',
    label: 'Time to Restore Service',
    description: 'How long it takes to recover from failures',
    color: '#ff9800',
  },
];

export const DoraDashboard = () => {
  const [timeUnit, setTimeUnit] = useState<'weekly' | 'monthly'>('weekly');
  const [useCustomDateRange, setUseCustomDateRange] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  const [filterDates, setFilterDates] = useState<{ start?: Date; end?: Date }>(
    {},
  );

  // Fetching metrics
  const {
    value: metricsData,
    loading,
    error,
  } = useMetricsData(timeUnit, filterDates.start, filterDates.end);

  // Clear date filters when toggling off
  useEffect(() => {
    if (!useCustomDateRange) {
      setFilterDates({});
    }
  }, [useCustomDateRange]);

  const handleTimeUnitChange = (
    event: SelectChangeEvent<'weekly' | 'monthly'>,
  ) => {
    setTimeUnit(event.target.value as 'weekly' | 'monthly');
  };

  const handleDateRangeToggle = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setUseCustomDateRange(event.target.checked);
  };

  const handleApplyDateFilter = () => {
    if (startDate && endDate) {
      if (new Date(startDate) > new Date(endDate)) {
        alert('Start date must be before end date');
        return;
      }

      setFilterDates({ start: startDate, end: endDate });
    } else {
      alert('Please select both start and end dates');
    }
  };

  if (loading) return <Progress />;
  if (error) return <ResponseErrorPanel error={error} />;

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', mb: 3 }}>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Data Filtering Options
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={useCustomDateRange}
                onChange={handleDateRangeToggle}
                color="primary"
              />
            }
            label="Use Custom Date Range"
            sx={{ mb: 2 }}
          />

          {!useCustomDateRange ? (
            <FormControl fullWidth sx={{ maxWidth: 250 }}>
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
          ) : (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'center' },
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={date => setStartDate(date)}
                  slotProps={{
                    textField: {
                      variant: 'outlined',
                      fullWidth: true,
                      sx: { minWidth: 180 },
                    },
                  }}
                />
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={date => setEndDate(date)}
                  minDate={startDate ?? undefined}
                  slotProps={{
                    textField: {
                      variant: 'outlined',
                      fullWidth: true,
                      sx: { minWidth: 180 },
                    },
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleApplyDateFilter}
                  sx={{ mt: { xs: 2, sm: 0 }, height: { sm: 56 } }}
                  disabled={!startDate || !endDate}
                >
                  Apply Date Filter
                </Button>
              </Box>

              {filterDates.start && filterDates.end && (
                <Typography
                  variant="body2"
                  sx={{ mt: 1, color: 'success.main' }}
                >
                  Showing data from {filterDates.start.toLocaleDateString()} to{' '}
                  {filterDates.end.toLocaleDateString()}
                </Typography>
              )}
            </LocalizationProvider>
          )}
        </Paper>
      </Box>

      <Grid container spacing={3}>
        {METRIC_TYPES.map(metric => {
          const metricData = metricsData?.find(m => m.id === metric.id);
          const hasData = metricData && metricData.dataPoints.length > 0;

          const chartData = hasData
            ? metricData.dataPoints.map(point => ({
                label: point.key,
                value: point.value,
              }))
            : [];

          return (
            <Grid item xs={12} md={6} key={metric.id}>
              {hasData ? (
                <MetricChart
                  title={metric.label}
                  description={metric.description}
                  data={chartData}
                  color={metric.color}
                />
              ) : (
                <Paper
                  sx={{
                    p: 2,
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="body1" color="text.secondary">
                    No data available for {metric.label} with the current filter
                    settings
                  </Typography>
                </Paper>
              )}
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};
