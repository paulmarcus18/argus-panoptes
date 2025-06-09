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
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemText,
  RadioGroup,
  Radio,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Progress, ResponseErrorPanel } from '@backstage/core-components';
import {
  useMetricsData,
  useProjects,
} from './ExampleFetchComponent/ExampleFetchComponent';
import { MetricChart } from './MetricChart';
import { SelectChangeEvent } from '@mui/material';

// Metric types
type MetricType = {
  id: string;
  label: string;
  description: string;
  color: string;
};

// Aggregation options
type AggregationType = 'daily' | 'monthly';

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

const AGGREGATION_OPTIONS = [
  { value: 'daily', label: 'Daily', defaultDays: 14 },
  { value: 'monthly', label: 'Monthly', defaultDays: 180 }, // ~6 months
];

export const DoraDashboard = () => {
  const [aggregation, setAggregation] = useState<AggregationType>('monthly');
  const [useCustomDateRange, setUseCustomDateRange] = useState(false);

  // Set default date ranges based on aggregation type
  const getDefaultDateRange = (aggType: AggregationType) => {
    const endDate = new Date();
    const startDate = new Date();
    const defaultDays =
      AGGREGATION_OPTIONS.find(opt => opt.value === aggType)?.defaultDays || 14;
    startDate.setDate(startDate.getDate() - defaultDays);
    return { startDate, endDate };
  };

  const [startDate, setStartDate] = useState<Date | null>(
    () => getDefaultDateRange('monthly').startDate,
  );
  const [endDate, setEndDate] = useState<Date | null>(
    () => getDefaultDateRange('monthly').endDate,
  );
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const [filterDates, setFilterDates] = useState<{ start?: Date; end?: Date }>(
    {},
  );

  // Update date range when aggregation changes
  useEffect(() => {
    if (!useCustomDateRange) {
      const { startDate: newStart, endDate: newEnd } =
        getDefaultDateRange(aggregation);
      setStartDate(newStart);
      setEndDate(newEnd);
    }
  }, [aggregation, useCustomDateRange]);

  // Fetch available projects
  const {
    value: availableProjects,
    loading: projectsLoading,
    error: projectsError,
  } = useProjects();

  // Set default project selection when projects are loaded
  useEffect(() => {
    if (
      availableProjects &&
      availableProjects.length > 0 &&
      selectedProjects.length === 0
    ) {
      setSelectedProjects(availableProjects);
    }
  }, [availableProjects, selectedProjects.length]);

  const {
    value: metricsData,
    loading,
    error,
  } = useMetricsData(
    aggregation,
    filterDates.start,
    filterDates.end,
    selectedProjects,
  );

  useEffect(() => {
    if (!useCustomDateRange) {
      setFilterDates({});
    }
  }, [useCustomDateRange]);

  const handleAggregationChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newAggregation = event.target.value as AggregationType;
    setAggregation(newAggregation);

    // Reset custom date range when changing aggregation
    if (!useCustomDateRange) {
      setFilterDates({});
    }
  };

  const handleDateRangeToggle = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setUseCustomDateRange(event.target.checked);
  };

  const handleProjectChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const newValue = typeof value === 'string' ? value.split(',') : value;

    if (newValue.includes('all')) {
      const allSelected =
        selectedProjects.length === (availableProjects?.length || 0);
      // Toggle behavior:
      setSelectedProjects(allSelected ? [] : availableProjects || []);
    } else {
      setSelectedProjects(newValue);
    }
  };

  const handleApplyDateFilter = () => {
    if (startDate && endDate) {
      if (new Date(startDate) > new Date(endDate)) {
        alert('Start date must be before end date');
        return;
      }

      // Validate date range based on aggregation type
      const daysDiff = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (aggregation === 'daily' && daysDiff > 90) {
        alert(
          'Daily aggregation is limited to 90 days maximum for performance reasons',
        );
        return;
      }

      if (aggregation === 'monthly' && daysDiff > 730) {
        // ~2 years
        alert('Monthly aggregation is limited to 2 years maximum');
        return;
      }

      setFilterDates({ start: startDate, end: endDate });
    } else {
      alert('Please select both start and end dates');
    }
  };

  const formatDateRange = () => {
    const start = filterDates.start || startDate;
    const end = filterDates.end || endDate;

    if (!start || !end) return 'No date range selected';

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };

    return `${start.toLocaleDateString(
      'en-US',
      options,
    )} - ${end.toLocaleDateString('en-US', options)}`;
  };

  if (projectsLoading) return <Progress />;
  if (projectsError) return <ResponseErrorPanel error={projectsError} />;
  if (loading) return <Progress />;
  if (error) return <ResponseErrorPanel error={error} />;

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', mb: 3 }}>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Data Filtering Options
          </Typography>

          {/* Aggregation Selection */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Data Aggregation
            </Typography>
            <RadioGroup
              row
              value={aggregation}
              onChange={handleAggregationChange}
              sx={{ mb: 2 }}
            >
              {AGGREGATION_OPTIONS.map(option => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio />}
                  label={option.label}
                />
              ))}
            </RadioGroup>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {aggregation === 'daily'
                ? 'Daily view shows data points for each day (recommended for up to 90 days)'
                : 'Monthly view shows aggregated data by month (recommended for longer time periods)'}
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              flexWrap: 'wrap',
              gap: 2,
              alignItems: 'center',
              mb: 2,
            }}
          >
            <FormControl sx={{ minWidth: 220 }} size="small">
              <InputLabel id="project-select-label">Projects</InputLabel>
              <Select
                labelId="project-select-label"
                id="project-select"
                multiple
                value={selectedProjects}
                onChange={handleProjectChange}
                input={<OutlinedInput label="Projects" />}
                renderValue={selected => {
                  if (selected.length === 0) return 'No projects selected';
                  if (selected.length === (availableProjects?.length || 0))
                    return 'All Projects';
                  if (selected.length === 1) return selected[0];
                  return `${selected.length} projects selected`;
                }}
              >
                <MenuItem value="all">
                  <Checkbox
                    checked={
                      selectedProjects.length ===
                      (availableProjects?.length || 0)
                    }
                  />
                  <ListItemText primary="All Projects" />
                </MenuItem>
                {(availableProjects || []).map(project => (
                  <MenuItem key={project} value={project}>
                    <Checkbox checked={selectedProjects.includes(project)} />
                    <ListItemText primary={project} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={useCustomDateRange}
                  onChange={handleDateRangeToggle}
                  color="primary"
                />
              }
              label="Use Custom Date Range"
            />
          </Box>

          {useCustomDateRange && (
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
            </LocalizationProvider>
          )}

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              <strong>Aggregation:</strong>{' '}
              {aggregation === 'daily' ? 'Daily' : 'Monthly'}
              <br />
              <strong>Date Range:</strong> {formatDateRange()}
              <br />
              <strong>Selected Projects:</strong>{' '}
              {selectedProjects.length > 0
                ? selectedProjects.join(', ')
                : 'None'}
            </Typography>
          </Box>
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
