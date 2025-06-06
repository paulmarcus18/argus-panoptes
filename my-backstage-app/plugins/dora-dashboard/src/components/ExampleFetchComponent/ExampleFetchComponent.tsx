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

// ------------------ Hook ------------------

export function useMetricsData(
  aggregation: 'monthly' = 'monthly',
  startDate?: Date,
  endDate?: Date,
  projects: string[] = ['project1'],
) {
  return useAsync(async (): Promise<MetricData[]> => {
    const baseUrl = 'http://localhost:7007/api/dora-dashboard/metrics';

    const defaultStart = new Date();
    defaultStart.setMonth(defaultStart.getMonth() - 6); // Last 6 months

    const defaultEnd = new Date();

    const start = startDate ?? defaultStart;
    const end = endDate ?? defaultEnd;

    const startTimestamp = Math.floor(start.getTime() / 1000);
    const endTimestamp = Math.floor(end.getTime() / 1000);

    // Use query parameters for projects
    const projectParam = projects.join(',');

    const results = await Promise.all(
      METRIC_TYPES.map(async metric => {
        const url = `${baseUrl}/${metric.id}/${aggregation}/${startTimestamp}/${endTimestamp}?projects=${projectParam}`;

        console.log(`📡 Fetching: ${url}`);

        try {
          const response = await fetch(url);

          if (!response.ok) {
            console.warn(
              `❌ Failed to fetch ${metric.label}: ${response.status} ${response.statusText}`,
            );
            return {
              id: metric.id,
              dataPoints: [],
            };
          }

          const json = await response.json();
          console.log(`✅ Response JSON for ${metric.id}:`, json);

          const dataPoints: DataPoint[] = (json || []).map((dp: any) => ({
            key: dp.data_key,
            value: dp.data_value,
            date: new Date(), // Optional: replace with real timestamp if needed
          }));

          return {
            id: metric.id,
            dataPoints,
          };
        } catch (error) {
          console.error(`💥 Error fetching ${metric.label}:`, error);
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

// ------------------ Debug Component ------------------

export const ExampleFetchComponent = () => {
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
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

  const handleFetch = () => {
    setShouldFetch(true);
  };

  const handleReset = () => {
    setShouldFetch(false);
  };

  // Only fetch when shouldFetch is true
  const { value, loading, error } = useMetricsData(
    'monthly',
    undefined,
    undefined,
    shouldFetch ? selectedProjects : [],
  );

  const renderContent = () => {
    if (!shouldFetch) {
      return (
        <Typography variant="body1" sx={{ mt: 2 }}>
          Click "Fetch Data" to load metrics for the selected projects.
        </Typography>
      );
    }

    if (loading) return <div>Loading...</div>;
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
          Fetched Data (Monthly Aggregation)
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Projects: {selectedProjects.join(', ')}
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
            Fetch Data
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
