import { Grid, Paper, Typography, Link } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { CatalogApi, catalogApiRef } from '@backstage/plugin-catalog-react';
import { Entity } from '@backstage/catalog-model';
import { BaseSemaphoreDialog } from './BaseSemaphoreDialogs';
import { FoundationUtils } from '../../utils/foundationUtils';
import type { GridSize } from '@material-ui/core';
import { SemaphoreData } from './types';
import { determineSemaphoreColor } from '../utils';
import {useEffect, useMemo, useState} from 'react';

/**
 * Styles for the dialog components
 */
const useStyles = makeStyles(theme => ({
  metricBox: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
  },
  metricValue: {
    fontWeight: 'bold',
    fontSize: '22px',
  },
  metricLabel: {
    color: theme.palette.text.secondary,
  },
  repoList: {
    marginTop: theme.spacing(3),
  },
}));

interface FoundationSemaphoreDialogProps {
  open: boolean;
  onClose: () => void;
  entities?: Entity[];
}

interface SystemConfig {
  redThreshold: number;
  configuredRepoNames: string[];
}

/**
 * Fetches system-level configuration like thresholds and repository lists
 * from the catalog entity for the system.
 * 
 * @param catalogApi - Backstage catalog API client
 * @param entities - List of entities to derive the system from
 * @returns Configuration object with thresholds and included repositories
 */
async function getSystemConfig(
  catalogApi: CatalogApi,
  entities: Entity[],
): Promise<SystemConfig> {
  const defaultConfig: SystemConfig = {
    redThreshold: 0.33,
    configuredRepoNames: [],
  };

  const systemName = entities[0]?.spec?.system;
  if (typeof systemName !== 'string' || !systemName) {
    return defaultConfig;
  }

    const namespace = entities[0].metadata.namespace ?? 'default';
    const systemEntity = await catalogApi.getEntityByRef({
      kind: 'System',
      namespace,
      name: systemName,
    });

    // Get red threshold from system annotation or use default
    const thresholdAnnotation =
      systemEntity?.metadata.annotations?.['foundation-check-threshold-red'];
    if (thresholdAnnotation) {
      defaultConfig.redThreshold = parseFloat(thresholdAnnotation);
    }

    // Get list of configured repositories from system annotation
    const configuredReposAnnotation =
      systemEntity?.metadata.annotations?.[
      'foundation-configured-repositories'
      ];
    if (configuredReposAnnotation) {
      defaultConfig.configuredRepoNames = configuredReposAnnotation
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0);
    }
  return defaultConfig;
}

/**
 * Main component for displaying Foundation Pipeline metrics in a dialog.
 * 
 * Shows workflow run success/failure statistics across repositories and displays
 * a traffic light indicator based on the system's health status.
 */
export const FoundationSemaphoreDialog: React.FC<
  FoundationSemaphoreDialogProps
> = ({ open, onClose, entities = [] }) => {
  const classes = useStyles();
  const techInsightsApi = useApi(techInsightsApiRef);
  const catalogApi = useApi(catalogApiRef);
  const foundationUtils = useMemo(() => new FoundationUtils(), []);

  // Component state
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    totalSuccess: 0,
    totalFailure: 0,
    totalRuns: 0,
    successRate: 0,
  });

  // Repositories with lowest success rates for display
  const [lowestSuccessRepos, setLowestSuccessRepos] = useState<
    { name: string; url: string; successRate: number }[]
  >([]);

  // Semaphore data containing color and summary
  const [data, setData] = useState<SemaphoreData>({
    color: 'gray',
    metrics: {},
    summary: 'No data available for this metric.',
    details: [],
  });

  /**
   * Effect hook to fetch metrics data when the dialog opens
   */
  useEffect(() => {
    if (!open || entities.length === 0) return;

    const fetchMetrics = async () => {
      setIsLoading(true);
      try {
        // Get system configuration for thresholds and repository list
        const { redThreshold, configuredRepoNames } = await getSystemConfig(
          catalogApi,
          entities,
        );

        // Filter entities based on configured repository names if provided
        const filteredEntities =
          configuredRepoNames.length > 0
            ? entities.filter(entity =>
              configuredRepoNames.includes(entity.metadata.name),
            )
            : entities;

        if (filteredEntities.length === 0) {
          setData({
            color: 'gray',

            summary: 'No configured repositories found for foundation checks.',
            metrics: {},
            details: [],
          });
          return;
        }

        // Process each entity to collect pipeline metrics in parallel
        const results = await Promise.all(
          filteredEntities.map(async entity => {
            const ref = {
              kind: entity.kind,
              namespace: entity.metadata.namespace ?? 'default',
              name: entity.metadata.name,
            };
            // Fetch both metrics and check results simultaneously
            const [facts, check] = await Promise.all([
              foundationUtils.getFoundationPipelineFacts(techInsightsApi, ref),
              foundationUtils.getFoundationPipelineChecks(techInsightsApi, ref),
            ]);
            const totalRuns = facts.successWorkflowRunsCount + facts.failureWorkflowRunsCount;
            // Calculate success rate as a percentage
            const successRate =
              totalRuns > 0
                ? (facts.successWorkflowRunsCount / totalRuns) * 100
                : 0;
            // Get GitHub actions URL from entity annotations
            const projectSlug = entity.metadata.annotations?.['github.com/project-slug'];

            const url = projectSlug
              ? `https://github.com/${projectSlug}/actions`
              : '#';

            return {
              name: entity.metadata.name,
              url,
              successRate: parseFloat(successRate.toFixed(2)),
              successWorkflowRunsCount: facts.successWorkflowRunsCount,
              failureWorkflowRunsCount: facts.failureWorkflowRunsCount,
              failedCheck: check.successRateCheck === false,
            };
          }),
        );

        // Calculate aggregate metrics across all repositories
        const totalSuccess = results.reduce((sum, r) => sum + r.successWorkflowRunsCount, 0);
        const totalFailure = results.reduce((sum, r) => sum + r.failureWorkflowRunsCount, 0);
        const totalRuns = totalSuccess + totalFailure;
        const successRate = totalRuns > 0 ? (totalSuccess / totalRuns) * 100 : 0;
        
        // Count repositories that failed their success rate check
        const failures = results.filter(r => r.failedCheck).length;
        
        // Determine traffic light color based on failure percentage
        const { color, reason } = determineSemaphoreColor(failures, filteredEntities.length, redThreshold);

        // Generate a human-readable summary based on the status
        let summary = reason;
        if (color === 'red') {
          summary += ' Critical attention required.';
        } else if (color === 'yellow') {
          summary += ' Issues should be addressed before release.';
        } else {
          summary += ' Code quality is good.';
        }

        if (configuredRepoNames.length > 0) {
          summary += ` (Based on ${filteredEntities.length} configured repositories)`;
        }

        // Sort repositories by success rate (ascending) to find worst performers
        const lowest = [...results]
          .sort((a, b) => a.successRate - b.successRate)
          .slice(0, 5)
          .map(({ name, url, successRate: itemSuccessRate }) => ({ name, url, successRate: itemSuccessRate }));
        // Update state with calculated metrics
        setMetrics({ totalSuccess, totalFailure, totalRuns, successRate: parseFloat(successRate.toFixed(2)) });
        setLowestSuccessRepos(lowest);
        setData({ color, summary, metrics: { totalSuccess, totalFailure, totalRuns, successRate: parseFloat(successRate.toFixed(2)) }, details: [] });
      } catch (e) {
        console.error('Failed to fetch Foundation pipeline data:', e);
        setData({
          color: 'gray',
          metrics: {},
          summary: 'Failed to load metrics.',
          details: [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [open, entities, techInsightsApi, catalogApi, foundationUtils]);

  /**
   * Renders the metrics section of the dialog, including:
   * - Success/failure counts and rates
   * - List of repositories with lowest success rates
   */
  const renderMetrics = () => (
    <>
      <Grid container spacing={2}>
        {[
          ['Successful Runs', metrics.totalSuccess, 4, '#4caf50'],
          ['Failed Runs', metrics.totalFailure, 4, '#f44336'],
          ['Success Rate (%)', metrics.successRate, 4, '#2196f3'],
        ].map(([label, value, size, color]) => (
          <Grid item xs={size as GridSize} key={label}>
            <Paper className={classes.metricBox} elevation={1}>
              <Typography
                variant="h4"
                className={classes.metricValue}
                style={{ color: color as string }}
              >
                {value}
              </Typography>
              <Typography className={classes.metricLabel}>{label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {lowestSuccessRepos.length > 0 && (
        <Grid container spacing={2} className={classes.repoList}>
          {lowestSuccessRepos.map(repo => (
            <Grid item xs={12} key={repo.name}>
              <Paper className={classes.metricBox} elevation={1}>
                <Link
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={classes.metricValue}
                >
                  {repo.name}
                </Link>
                <Typography className={classes.metricLabel}>
                  Success Rate: {repo.successRate}%
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );

  // Render the dialog with all metrics and status information
  return (
    <BaseSemaphoreDialog
      open={open}
      onClose={onClose}
      title="Foundation Pipeline Insights"
      data={data}
      isLoading={isLoading}
      renderMetrics={renderMetrics}
    />
  );
};
