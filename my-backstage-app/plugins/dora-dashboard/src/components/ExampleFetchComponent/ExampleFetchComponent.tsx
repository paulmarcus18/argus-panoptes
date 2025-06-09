import React, { useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Chip,
  OutlinedInput,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material';

// ------------------ Types ------------------

export type DataPoint = {
  key: string;
  value: number;
  date?: Date;
};

export type MetricData = {
  id: string;
  dataPoints: DataPoint[];
};

const METRIC_TYPES = [
  { id: 'df', label: 'Deploy Freq Avg' },
  { id: 'mltc', label: 'Lead Time Median' },
  { id: 'cfr', label: 'Change Failure Rate' },
  { id: 'mttr', label: 'Time to Restore' },
];

// ------------------ Projects Hook ------------------

export function useProjects() {
  return useAsync(async (): Promise<string[]> => {
    const url = 'http://localhost:7007/api/dora-dashboard/projects';

    try {
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(
          `❌ Failed to fetch projects: ${response.status} ${response.statusText}`,
        );
        return [];
      }

      const projects = await response.json();
      console.log('✅ Fetched projects:', projects);

      return Array.isArray(projects) ? projects : [];
    } catch (error) {
      console.error('💥 Error fetching projects:', error);
      return [];
    }
  }, []);
}

// ------------------ Enhanced Hook with Daily Support ------------------

export function useMetricsData(
  aggregation: 'daily' | 'monthly' = 'monthly',
  startDate?: Date,
  endDate?: Date,
  projects: string[] = ['project1'],
) {
  return useAsync(async (): Promise<MetricData[]> => {
    const baseUrl = 'http://localhost:7007/api/dora-dashboard/metrics';

    // Set default date ranges based on aggregation type
    const getDefaultDates = () => {
      const end = new Date();
      const start = new Date();

      if (aggregation === 'daily') {
        // Default to last 14 days for daily view
        start.setDate(start.getDate() - 14);
      } else {
        // Default to last 6 months for monthly view
        start.setMonth(start.getMonth() - 6);
      }

      return { start, end };
    };

    const { start: defaultStart, end: defaultEnd } = getDefaultDates();
    const start = startDate ?? defaultStart;
    const end = endDate ?? defaultEnd;

    const startTimestamp = Math.floor(start.getTime() / 1000);
    const endTimestamp = Math.floor(end.getTime() / 1000);

    // Use query parameters for projects
    const projectParam = projects.join(',');

    // Validate date range for daily aggregation
    if (aggregation === 'daily') {
      const daysDiff = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysDiff > 90) {
        console.warn('⚠️ Daily aggregation limited to 90 days for performance');
        // Adjust end date to 90 days from start
        const adjustedEnd = new Date(start);
        adjustedEnd.setDate(adjustedEnd.getDate() + 90);
        console.log(
          `📅 Adjusted end date from ${end.toISOString()} to ${adjustedEnd.toISOString()}`,
        );
      }
    }

    const results = await Promise.all(
      METRIC_TYPES.map(async metric => {
        const url = `${baseUrl}/${metric.id}/${aggregation}/${startTimestamp}/${endTimestamp}?projects=${projectParam}`;

        console.log(`📡 Fetching ${aggregation} data: ${url}`);

        try {
          const response = await fetch(url);

          if (!response.ok) {
            console.warn(
              `❌ Failed to fetch ${metric.label} (${aggregation}): ${response.status} ${response.statusText}`,
            );
            return {
              id: metric.id,
              dataPoints: [],
            };
          }

          const json = await response.json();
          console.log(
            `✅ Response JSON for ${metric.id} (${aggregation}):`,
            json,
          );

          const dataPoints: DataPoint[] = (json || []).map((dp: any) => {
            // Parse the date from data_key for better date handling
            let date: Date | undefined;
            try {
              if (dp.data_key) {
                if (aggregation === 'daily') {
                  // For daily data, data_key should be in format 'YYYY-MM-DD'
                  date = new Date(dp.data_key + 'T00:00:00');
                } else {
                  // For monthly data, you might need to adjust this based on your format
                  // Assuming format like '2024-01' or similar
                  date = new Date(dp.data_key + '-01T00:00:00');
                }
              }
            } catch (e) {
              console.warn(
                `Failed to parse date from data_key: ${dp.data_key}`,
              );
            }

            return {
              key: dp.data_key,
              value: dp.data_value,
              date: date,
            };
          });

          // Sort data points by date for better chart display
          dataPoints.sort((a, b) => {
            if (!a.date || !b.date) return 0;
            return a.date.getTime() - b.date.getTime();
          });

          return {
            id: metric.id,
            dataPoints,
          };
        } catch (error) {
          console.error(
            `💥 Error fetching ${metric.label} (${aggregation}):`,
            error,
          );
          return {
            id: metric.id,
            dataPoints: [],
          };
        }
      }),
    );

    return results;
  }, [
    aggregation,
    startDate?.getTime(),
    endDate?.getTime(),
    JSON.stringify(projects),
  ]);
}

// ------------------ Enhanced Debug Component ------------------

export const ExampleFetchComponent = () => {
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [aggregation, setAggregation] = useState<'daily' | 'monthly'>(
    'monthly',
  );
  const [shouldFetch, setShouldFetch] = useState(false);

  // Fetch available projects
  const {
    value: availableProjects,
    loading: projectsLoading,
    error: projectsError,
  } = useProjects();

  // Set default project selection when projects are loaded
  React.useEffect(() => {
    if (
      availableProjects &&
      availableProjects.length > 0 &&
      selectedProjects.length === 0
    ) {
      setSelectedProjects([availableProjects[0]]);
    }
  }, [availableProjects, selectedProjects.length]);

  const handleProjectChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedProjects(typeof value === 'string' ? value.split(',') : value);
  };

  const handleAggregationChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setAggregation(event.target.value as 'daily' | 'monthly');
    // Reset fetch state when changing aggregation
    setShouldFetch(false);
  };

  const handleFetch = () => {
    setShouldFetch(true);
  };

  const handleReset = () => {
    setShouldFetch(false);
  };

  // Only fetch when shouldFetch is true
  const { value, loading, error } = useMetricsData(
    aggregation,
    undefined,
    undefined,
    shouldFetch ? selectedProjects : [],
  );

  const renderContent = () => {
    if (!shouldFetch) {
      return (
        <Typography variant="body1" sx={{ mt: 2 }}>
          Click "Fetch Data" to load metrics for the selected projects with{' '}
          {aggregation} aggregation.
        </Typography>
      );
    }

    if (loading) return <div>Loading {aggregation} data...</div>;
    if (error) return <div>Error: {error.message}</div>;

    if (!value || value.length === 0) {
      return <div>No data available</div>;
    }

    const allKeys = new Set<string>();
    const metricMaps = value.map(metric => {
      const map: Record<string, number> = {};
      for (const dp of metric.dataPoints) {
        map[dp.key] = dp.value;
        allKeys.add(dp.key);
      }
      return map;
    });

    const rows = Array.from(allKeys).map(key => {
      const row: { key: string; [metric: string]: number | string } = { key };
      METRIC_TYPES.forEach((metric, i) => {
        row[metric.label] = metricMaps[i][key] ?? 0;
      });
      return row;
    });

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Fetched Data ({aggregation === 'daily' ? 'Daily' : 'Monthly'}{' '}
          Aggregation)
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Projects: {selectedProjects.join(', ')} | Data points: {rows.length}
        </Typography>
        <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
          <pre style={{ overflow: 'auto', fontSize: '12px' }}>
            {JSON.stringify(rows, null, 2)}
          </pre>
        </Paper>
      </Box>
    );
  };

  if (projectsLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body1">Loading available projects...</Typography>
      </Box>
    );
  }

  if (projectsError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body1" color="error">
          Error loading projects: {projectsError.message}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        DORA Metrics Debug Component
      </Typography>

      <Typography variant="body1" sx={{ mb: 2 }}>
        This component is for debug/testing. For visual charts, use{' '}
        <strong>DoraDashboard</strong>.
      </Typography>

      <Box sx={{ mb: 3 }}>
        {/* Aggregation Selection */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Data Aggregation
          </Typography>
          <RadioGroup
            row
            value={aggregation}
            onChange={handleAggregationChange}
          >
            <FormControlLabel value="daily" control={<Radio />} label="Daily" />
            <FormControlLabel
              value="monthly"
              control={<Radio />}
              label="Monthly"
            />
          </RadioGroup>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {aggregation === 'daily'
              ? 'Daily view shows last 14 days by default'
              : 'Monthly view shows last 6 months by default'}
          </Typography>
        </Box>

        <FormControl fullWidth sx={{ mb: 2, maxWidth: 400 }}>
          <InputLabel id="debug-project-select-label">
            Select Projects
          </InputLabel>
          <Select
            labelId="debug-project-select-label"
            multiple
            value={selectedProjects}
            onChange={handleProjectChange}
            input={<OutlinedInput label="Select Projects" />}
            renderValue={selected => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map(value => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            {(availableProjects || []).map(project => (
              <MenuItem key={project} value={project}>
                {project}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleFetch}
            disabled={selectedProjects.length === 0}
          >
            Fetch {aggregation === 'daily' ? 'Daily' : 'Monthly'} Data
          </Button>
          <Button
            variant="outlined"
            onClick={handleReset}
            disabled={!shouldFetch}
          >
            Reset
          </Button>
        </Box>
      </Box>

      {renderContent()}
    </Box>
  );
};
