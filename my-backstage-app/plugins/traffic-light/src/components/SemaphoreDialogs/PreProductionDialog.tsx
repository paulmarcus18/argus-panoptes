import { Grid, Paper, Typography, Link } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Entity } from '@backstage/catalog-model';
import { BaseSemaphoreDialog } from './BaseSemaphoreDialogs';
import { PreproductionUtils } from '../../utils/preproductionUtils';
import type { GridSize } from '@material-ui/core';
import { SemaphoreData } from './types';
import { determineSemaphoreColor } from '../utils';
import { useState, useMemo, useEffect } from 'react';

/**
 * Styles for the preproduction dialog components
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
  repoLink: {
    fontWeight: 500,
  },
}));

/**
 * Props for the PreproductionSemaphoreDialog component
 * 
 * @property {boolean} open - Whether the dialog is open or closed
 * @property {() => void} onClose - Callback function when dialog is closed
 * @property {Entity[]} [entities] - Array of Backstage entities to evaluate
 */
interface PreproductionSemaphoreDialogProps {
  open: boolean;
  onClose: () => void;
  entities?: Entity[];
}

/**
 * Dialog component that displays detailed metrics about preproduction pipeline runs
 * 
 * Shows aggregated success rates, failed runs, and repositories with the lowest success rates.
 * Uses system annotations to determine thresholds and which repositories to include in the analysis.
 */
export const PreproductionSemaphoreDialog: React.FC<
  PreproductionSemaphoreDialogProps
> = ({ open, onClose, entities = [] }) => {
  const classes = useStyles();
  // APIs for retrieving data
  const techInsightsApi = useApi(techInsightsApiRef);
  const catalogApi = useApi(catalogApiRef);
  const preprodUtils = useMemo(() => new PreproductionUtils(), []);

  // Component state
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    totalSuccess: 0,
    totalFailure: 0,
    totalRuns: 0,
    successRate: 0,
  });

  // State for tracking repositories with lowest success rates
  const [lowestSuccessRepos, setLowestSuccessRepos] = useState<
    { name: string; url: string; successRate: number }[]
  >([]);

  // Main data for the semaphore display
  const [data, setData] = useState<SemaphoreData>({
    color: 'gray',
    metrics: {},
    summary: 'No data available for this metric.',
    details: [],
  });

  /**
   * Effect that loads pipeline metrics when the dialog opens
   * or when entities change
   */
  useEffect(() => {
    // Skip if dialog is closed or there are no entities
    if (!open || entities.length === 0) return;

    setIsLoading(true);

    /**
     * Fetches pipeline metrics and evaluates them against thresholds
     * to determine the traffic light color and summary
     */
    const fetchPipelineMetrics = async () => {
      try {
        // 1. Get threshold and configured repositories from system annotations
        let redThreshold = 0.33; // Default threshold if not specified in annotations
        let configuredRepoNames: string[] = [];

        const systemName = entities[0].spec?.system;
        const namespace = entities[0].metadata.namespace?? 'default';

        // If we have a system, get its configuration from the catalog
        if (systemName) {
          const systemEntity = await catalogApi.getEntityByRef({
            kind: 'System',
            namespace,
            name:
              typeof systemName === 'string' ? systemName : (JSON.stringify(systemName) ?? ''),
          });

          // Extract threshold for red traffic light from system annotation
          const thresholdAnnotation =
            systemEntity?.metadata.annotations?.[
              'preproduction-check-threshold-red'
            ];
          if (thresholdAnnotation) {
            redThreshold = parseFloat(thresholdAnnotation);
          }

          // Get configured repositories for preproduction checks
          const configuredReposAnnotation =
            systemEntity?.metadata.annotations?.[
              'preproduction-configured-repositories'
            ];
          if (configuredReposAnnotation) {
            configuredRepoNames = configuredReposAnnotation
              .split(',')
              .map(name => name.trim())
              .filter(name => name.length > 0);
          }
        }

        // 2. Filter entities to only include configured repositories
        // If no repositories are configured, include all entities
        const filteredEntities =
          configuredRepoNames.length > 0
            ? entities.filter(entity =>
                configuredRepoNames.includes(entity.metadata.name),
              )
            : entities; // Fallback to all entities if no configuration found

        // Handle case where no entities are left after filtering
        if (filteredEntities.length === 0) {
          setMetrics({
            totalSuccess: 0,
            totalFailure: 0,
            totalRuns: 0,
            successRate: 0,
          });
          setLowestSuccessRepos([]);
          setData({
            color: 'gray',
            metrics: {},
            summary:
              'No configured repositories found for preproduction checks.',
            details: [],
          });
          return;
        }

        // 3. Gather facts + checks in parallel for filtered entities
        const results = await Promise.all(
          filteredEntities.map(async entity => {
            // Create a reference to the entity for API calls
            const ref = {
              kind: entity.kind,
              namespace: entity.metadata.namespace ?? 'default',
              name: entity.metadata.name,
            };

            // Get both facts and check results in parallel
            const [facts, check] = await Promise.all([
              preprodUtils.getPreproductionPipelineFacts(techInsightsApi, ref),
              preprodUtils.getPreproductionPipelineChecks(techInsightsApi, ref),
            ]);

            // Calculate the success rate for this specific entity
            const successRate =
              facts.successWorkflowRunsCount + facts.failureWorkflowRunsCount >
              0
                ? (facts.successWorkflowRunsCount /
                    (facts.successWorkflowRunsCount +
                      facts.failureWorkflowRunsCount)) *
                  100
                : 0;

            // Get the GitHub URL for this repository's actions page
            const projectSlug =
              entity.metadata.annotations?.['github.com/project-slug'];
            const url = projectSlug
              ? `https://github.com/${projectSlug}/actions`
              : '#';

            // Return combined data for this entity
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

        // 4. Metrics aggregation
        // Calculate totals across all repositories
        const totalSuccess = results.reduce(
          (sum, r) => sum + r.successWorkflowRunsCount,
          0,
        );
        const totalFailure = results.reduce(
          (sum, r) => sum + r.failureWorkflowRunsCount,
          0,
        );
        const totalRuns = totalSuccess + totalFailure;
        const successRate =
          totalRuns > 0 ? (totalSuccess / totalRuns) * 100 : 0;

        // Count how many entities failed their checks
        const failures = results.filter(r => r.failedCheck).length;

        // 5. Determine traffic light color based on filtered entities
        const { color, reason } = determineSemaphoreColor(
          failures,
          filteredEntities.length,
          redThreshold,
        );

        // 5. Prepare summary message
        let summary = reason;
        if (color === 'red') {
          summary += ' Critical attention required.';
        } else if (color === 'yellow') {
          summary += ' Issues should be addressed before release.';
        } else {
          summary += ' Code quality is good.';
        }

        // Add info about configured repositories
        if (configuredRepoNames.length > 0) {
          summary += ` (Based on ${filteredEntities.length} configured repositories)`;
        }

        // 6. Bottom 5 repos by success rate
        // Sort by success rate ascending and take the 5 worst performing repos
        const lowest = [...results]
          .sort((a, b) => a.successRate - b.successRate)
          .slice(0, 5)
          .map(({ name, url, successRate: itemSuccessRate }) => ({
            name,
            url,
            successRate: itemSuccessRate,
          }));

        // Update component state with all the calculated metrics
        setMetrics({
          totalSuccess,
          totalFailure,
          totalRuns,
          successRate: parseFloat(successRate.toFixed(2)),
        });

        setLowestSuccessRepos(lowest);

        setData({
          color,
          summary,
          metrics: {
            totalSuccess,
            totalFailure,
            totalRuns,
            successRate: parseFloat(successRate.toFixed(2)),
          },
          details: [],
        });
      } catch {
        // Handle errors gracefully
        setMetrics({
          totalSuccess: 0,
          totalFailure: 0,
          totalRuns: 0,
          successRate: 0,
        });
        setLowestSuccessRepos([]);
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

    fetchPipelineMetrics();
  }, [open, entities, techInsightsApi, catalogApi, preprodUtils]);

  /**
   * Renders the metrics grid and lowest success rate repositories
   * @returns JSX.Element containing the metrics visualization
   */
  const renderMetrics = () => (
    <>
      {/* Grid of key metrics with colored values */}
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

      {/* List of repositories with lowest success rates */}
      {lowestSuccessRepos.length > 0 && (
        <div className={classes.repoList}>
          <Typography variant="h6">Lowest Success Rate Repositories</Typography>
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
        </div>
      )}
    </>
  );

  return (
    <BaseSemaphoreDialog
      open={open}
      onClose={onClose}
      title="Preproduction Pipeline Insights"
      data={data}
      isLoading={isLoading}
      renderMetrics={renderMetrics}
    />
  );
};