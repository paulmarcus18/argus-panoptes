import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Link,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { Entity } from '@backstage/catalog-model';
import { BaseSemaphoreDialog } from './BaseSemaphoreDialogs';
import { ReportingUtils } from '../../utils/reportingUtils';
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
  repoLink: {
    fontWeight: 500,
  },
  workflowSection: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  workflowMetricBox: {
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(1),
    backgroundColor: theme.palette.background.default,
  },
  workflowName: {
    fontWeight: 600,
    fontSize: '16px',
    marginBottom: theme.spacing(0.5),
  },
  workflowStats: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

}));

interface WorkflowMetrics {
  workflowName: string;
  totalRuns: number;
  successfulRuns: number;
  successRate: number;
}

interface RepoWorkflowData {
  name: string;
  url: string;
  overallSuccessRate: number;
  workflowMetrics: WorkflowMetrics[];
}

interface ReportingSemaphoreDialogProps {
  open: boolean;
  onClose: () => void;
  entities?: Entity[];
}

export const ReportingSemaphoreDialog: React.FC<
  ReportingSemaphoreDialogProps
> = ({ open, onClose, entities = [] }) => {
  const classes = useStyles();
  const techInsightsApi = useApi(techInsightsApiRef);
  const reportingUtils = React.useMemo(() => new ReportingUtils(), []);

  const [isLoading, setIsLoading] = React.useState(false);
  const [aggregateMetrics, setAggregateMetrics] = React.useState({
    totalSuccess: 0,
    totalFailure: 0,
    totalRuns: 0,
    successRate: 0,
  });

  const [aggregatedWorkflowMetrics, setAggregatedWorkflowMetrics] = React.useState<WorkflowMetrics[]>([]);
  const [repoWorkflowData, setRepoWorkflowData] = React.useState<RepoWorkflowData[]>([]);
  const [lowestSuccessRepos, setLowestSuccessRepos] = React.useState<
    { name: string; url: string; overallSuccessRate: number; workflowMetrics: WorkflowMetrics[] }[]
  >([]);

  React.useEffect(() => {
    if (!open || entities.length === 0) return;

    setIsLoading(true);

    const fetchPipelineMetrics = async () => {
      try {
        const results = await Promise.all(
          entities.map(async entity => {
            const ref = {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            };

            // Get the reporting pipeline facts using your fact retriever data
            const facts = await reportingUtils.getReportingPipelineFacts(
              techInsightsApi,
              ref,
            );

            const projectSlug =
              entity.metadata.annotations?.['github.com/project-slug'];
            const url = projectSlug
              ? `https://github.com/${projectSlug}/actions`
              : '#';

            // Extract workflow metrics from the facts with proper type checking
            const workflowMetrics: WorkflowMetrics[] = Array.isArray(facts.workflowMetrics) 
              ? facts.workflowMetrics 
              : [];
            const overallSuccessRate = typeof facts.overallSuccessRate === 'number' 
              ? facts.overallSuccessRate 
              : 0;
            
            // Calculate totals for aggregate metrics
            const totalRuns = workflowMetrics.reduce((sum, wf) => sum + wf.totalRuns, 0);
            const totalSuccessful = workflowMetrics.reduce((sum, wf) => sum + wf.successfulRuns, 0);
            const totalFailure = totalRuns - totalSuccessful;

            return {
              name: entity.metadata.name,
              url,
              overallSuccessRate,
              workflowMetrics,
              totalRuns,
              totalSuccessful,
              totalFailure,
            };
          }),
        );

        // Aggregate workflow metrics across all entities
        const workflowAggregation = new Map<string, { totalRuns: number; successfulRuns: number }>();
        
        results.forEach(result => {
          result.workflowMetrics.forEach(workflow => {
            const existing = workflowAggregation.get(workflow.workflowName) || { totalRuns: 0, successfulRuns: 0 };
            workflowAggregation.set(workflow.workflowName, {
              totalRuns: existing.totalRuns + workflow.totalRuns,
              successfulRuns: existing.successfulRuns + workflow.successfulRuns,
            });
          });
        });

        const aggregatedWorkflows: WorkflowMetrics[] = Array.from(workflowAggregation.entries()).map(([workflowName, data]) => ({
          workflowName,
          totalRuns: data.totalRuns,
          successfulRuns: data.successfulRuns,
          successRate: data.totalRuns > 0 ? parseFloat(((data.successfulRuns / data.totalRuns) * 100).toFixed(2)) : 0,
        }));

        // Calculate global aggregate metrics
        const totalSuccess = results.reduce((sum, r) => sum + r.totalSuccessful, 0);
        const totalFailure = results.reduce((sum, r) => sum + r.totalFailure, 0);
        const totalRuns = totalSuccess + totalFailure;
        const successRate = totalRuns > 0 ? (totalSuccess / totalRuns) * 100 : 0;

        // Prepare repo workflow data
        const repoData: RepoWorkflowData[] = results.map(({ name, url, overallSuccessRate, workflowMetrics }) => ({
          name,
          url,
          overallSuccessRate,
          workflowMetrics,
        }));

        // Bottom 5 repos by success rate - now showing individual workflow metrics
        const lowest = [...results]
          .sort((a, b) => a.overallSuccessRate - b.overallSuccessRate)
          .slice(0, 5)
          .map(({ name, url, overallSuccessRate, workflowMetrics }) => ({
            name,
            url,
            overallSuccessRate,
            workflowMetrics,
          }));

        setAggregateMetrics({
          totalSuccess,
          totalFailure,
          totalRuns,
          successRate: parseFloat(successRate.toFixed(2)),
        });
        setAggregatedWorkflowMetrics(aggregatedWorkflows);
        setRepoWorkflowData(repoData);
        setLowestSuccessRepos(lowest);
      } catch (e) {
        console.error('Failed to fetch pipeline data:', e);
        setAggregateMetrics({
          totalSuccess: 0,
          totalFailure: 0,
          totalRuns: 0,
          successRate: 0,
        });
        setAggregatedWorkflowMetrics([]);
        setRepoWorkflowData([]);
        setLowestSuccessRepos([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPipelineMetrics();
  }, [open, entities, techInsightsApi, reportingUtils]);



  const renderMetrics = () => (
    <>
      {/* Aggregate Metrics */}
      <Grid container spacing={2}>
        {[
          ['Successful Runs', aggregateMetrics.totalSuccess, 4, '#4caf50'],
          ['Failed Runs', aggregateMetrics.totalFailure, 4, '#f44336'],
          ['Success Rate (%)', aggregateMetrics.successRate, 4, '#2196f3'],
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

      {/* Aggregated Workflow Metrics Across All Entities (Only Reporting Workflows) */}
      {aggregatedWorkflowMetrics.length > 0 && (
        <div className={classes.workflowSection}>
          <Typography variant="h6" style={{ marginBottom: '16px' }}>
            Reporting Workflow Metrics
          </Typography>
          <Grid container spacing={1}>
            {aggregatedWorkflowMetrics.map((workflow, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Paper className={classes.workflowMetricBox} elevation={1}>
                  <Typography className={classes.workflowName}>
                    {workflow.workflowName}
                  </Typography>
                  <div className={classes.workflowStats}>
                    <Typography variant="body2" className={classes.metricLabel}>
                      {workflow.successfulRuns}/{workflow.totalRuns} runs
                    </Typography>
                    <Typography variant="body2">
                      {workflow.successRate}%
                    </Typography>
                  </div>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </div>
      )}

      {/* Bottom 5 repos by success rate - showing individual workflow metrics */}
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
                  
                  {/* Show overall success rate */}
                  <Typography 
                    className={classes.metricLabel}
                    style={{ marginTop: '8px', fontSize: '16px', fontWeight: 500 }}
                  >
                    Overall Success Rate: {repo.overallSuccessRate}%
                  </Typography>
                  
                  {/* Show individual reporting workflow metrics for this repo */}
                  {repo.workflowMetrics.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <Typography variant="body2" className={classes.metricLabel} style={{ marginBottom: '8px' }}>
                        Reporting Workflow Success Rates:
                      </Typography>
                      <Grid container spacing={1}>
                        {repo.workflowMetrics.map((workflow, index) => (
                          <Grid item xs={12} sm={6} key={index}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                              <Typography variant="body2" style={{ fontSize: '14px' }}>
                                {workflow.workflowName}
                              </Typography>
                              <Typography variant="body2" style={{ fontSize: '14px', fontWeight: 500 }}>
                                {workflow.successRate}% ({workflow.successfulRuns}/{workflow.totalRuns})
                              </Typography>
                            </div>
                          </Grid>
                        ))}
                      </Grid>
                    </div>
                  )}
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
    title="Reporting Pipeline Insights"
    data={{ color: 'gray', summary: '', metrics: {}, details: [] }}
    isLoading={isLoading}
    renderMetrics={renderMetrics}
  />
);
}