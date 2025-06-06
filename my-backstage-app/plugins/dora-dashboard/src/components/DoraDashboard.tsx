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

const AVAILABLE_PROJECTS = ['project1', 'project2', 'project3'];

export const DoraDashboard = () => {
  const [useCustomDateRange, setUseCustomDateRange] = useState(false);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [startDate, setStartDate] = useState<Date | null>(sixMonthsAgo);
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [selectedProjects, setSelectedProjects] =
    useState<string[]>(AVAILABLE_PROJECTS);

  const [filterDates, setFilterDates] = useState<{ start?: Date; end?: Date }>(
    {},
  );

  const {
    value: metricsData,
    loading,
    error,
  } = useMetricsData(
    'monthly',
    filterDates.start,
    filterDates.end,
    selectedProjects,
  );

  useEffect(() => {
    if (!useCustomDateRange) {
      setFilterDates({});
    }
  }, [useCustomDateRange]);

  const handleDateRangeToggle = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setUseCustomDateRange(event.target.checked);
  };

  const handleProjectChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const newValue = typeof value === 'string' ? value.split(',') : value;

    if (newValue.includes('all')) {
      const allSelected = selectedProjects.length === AVAILABLE_PROJECTS.length;
      // Toggle behavior:
      setSelectedProjects(allSelected ? [] : AVAILABLE_PROJECTS);
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
                  if (selected.length === AVAILABLE_PROJECTS.length)
                    return 'All Projects';
                  if (selected.length === 1) return selected[0];
                  return `${selected.length} projects selected`;
                }}
              >
                <MenuItem value="all">
                  <Checkbox
                    checked={
                      selectedProjects.length === AVAILABLE_PROJECTS.length
                    }
                  />

                  <ListItemText primary="All Projects" />
                </MenuItem>
                {AVAILABLE_PROJECTS.map(project => (
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

          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            Data aggregation: Monthly | Selected projects:{' '}
            {selectedProjects.join(', ')}
          </Typography>
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
