import React from 'react';
import { Grid, Paper, Typography, Link } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { Entity } from '@backstage/catalog-model';
import { BaseSemaphoreDialog } from './BaseSemaphoreDialogs';
import { FoundationUtils } from '../../utils/foundationUtils';
import type { GridSize } from '@material-ui/core';

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

export const FoundationSemaphoreDialog: React.FC<
  FoundationSemaphoreDialogProps
> = ({ open, onClose, entities = [] }) => {
  const classes = useStyles();
  const techInsightsApi = useApi(techInsightsApiRef);
  const foundationUtils = React.useMemo(() => new FoundationUtils(), []);

  const [isLoading, setIsLoading] = React.useState(false);
  const [metrics, setMetrics] = React.useState({
    totalSuccess: 0,
    totalFailure: 0,
    totalRuns: 0,
    successRate: 0,
  });

  const [lowestSuccessRepos, setLowestSuccessRepos] = React.useState<
    { name: string; url: string; successRate: number }[]
  >([]);

  React.useEffect(() => {
    if (!open || entities.length === 0) return;

    setIsLoading(true);

    const fetchMetrics = async () => {
      try {
        const results = await Promise.all(
          entities.map(async entity => {
            const ref = {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            };

            const facts = await foundationUtils.getFoundationPipelineFacts(
              techInsightsApi,
              ref,
            );

            const successRate =
              facts.successWorkflowRunsCount + facts.failureWorkflowRunsCount >
              0
                ? (facts.successWorkflowRunsCount /
                    (facts.successWorkflowRunsCount +
                      facts.failureWorkflowRunsCount)) *
                  100
                : 0;

            const projectSlug =
              entity.metadata.annotations?.['github.com/project-slug'];
            const url = projectSlug
              ? `https://github.com/${projectSlug}/actions`
              : '#';

            return {
              name: entity.metadata.name,
              url,
              successRate: parseFloat(successRate.toFixed(2)),
              successWorkflowRunsCount: facts.successWorkflowRunsCount,
              failureWorkflowRunsCount: facts.failureWorkflowRunsCount,
            };
          }),
        );

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

        const lowest = [...results]
          .sort((a, b) => a.successRate - b.successRate)
          .slice(0, 5)
          .map(({ name, url, successRate }) => ({
            name,
            url,
            successRate,
          }));

        setMetrics({
          totalSuccess,
          totalFailure,
          totalRuns,
          successRate: parseFloat(successRate.toFixed(2)),
        });
        setLowestSuccessRepos(lowest);
      } catch (e) {
        console.error('Failed to fetch Foundation pipeline data:', e);
        setMetrics({
          totalSuccess: 0,
          totalFailure: 0,
          totalRuns: 0,
          successRate: 0,
        });
        setLowestSuccessRepos([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [open, entities, techInsightsApi, foundationUtils]);

  const renderMetrics = () => (
    <>
      <Grid container spacing={2}>
        {[
          ['Successful Runs', metrics.totalSuccess, 4, '#4caf50'],
          ['Failed Runs', metrics.totalFailure, 4, '#f44336'],
          ['Success Rate (%)', metrics.successRate, 4, '#2196f3'],
        ].map(([label, value, size, color], index) => (
          <Grid item xs={size as GridSize} key={index}>
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

      {/* Bottom 5 repos by success rate */}
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

  return (
    <BaseSemaphoreDialog
      open={open}
      onClose={onClose}
      title="Foundation Pipeline Insights"
      data={{ color: 'gray', summary: '', metrics: {}, details: [] }}
      isLoading={isLoading}
      renderMetrics={renderMetrics}
    />
  );
};
