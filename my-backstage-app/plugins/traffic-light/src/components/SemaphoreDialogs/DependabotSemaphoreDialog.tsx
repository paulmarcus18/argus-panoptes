import React from 'react';
import { Grid, Paper, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { Entity } from '@backstage/catalog-model';
import { BaseSemaphoreDialog } from './BaseSemaphoreDialogs';
import { GithubAdvancedSecurityUtils } from '../../utils/githubAdvancedSecurityUtils';
import { SemaphoreData, IssueDetail, Severity } from './types';
import type { GridSize } from '@material-ui/core';


    // Filter systems based on search term
  // useEffect(() => {
  //   const fetchTopRepos = async () => {
  //     if (!detailedDialogOpen || currentSemaphoreType !== 'Dependabot') return;
  //     if (selectedEntities.length === 0) return;
  
  //     try {
  //       const top5 = await getTop5CriticalDependabotRepos(techInsightsApi, selectedEntities);
  //       setTopCriticalRepos(top5);
  //     } catch (e) {
  //       console.error('❌ Failed to fetch top critical repos', e);
  //     }
  //   };
  
  //   fetchTopRepos();
  // }, [
  //   detailedDialogOpen,
  //   currentSemaphoreType,
  //   selectedEntities,  // ✅ ensures updates when filters change
  //   techInsightsApi,
  // ]);



  // useEffect(() => {
  //   const fetchTopRepos = async () => {
  //     if (!detailedDialogOpen || currentSemaphoreType !== 'Dependabot') return;
  //     if (selectedEntities.length === 0) return;
  
  //     try {
  //       const top5 = await getTop5CriticalDependabotRepos(techInsightsApi, selectedEntities);
  //       setTopCriticalRepos(top5);
  //     } catch (e) {
  //       console.error('❌ Failed to fetch top critical repos', e);
  //     }
  //   };
  
  //   fetchTopRepos();
  // }, [
  //   detailedDialogOpen,
  //   currentSemaphoreType,
  //   selectedEntities,  // ✅ ensures updates when filters change
  //   techInsightsApi,
  // ]);
  // Dependabot traffic light component (existing implementation)
// interface DependabotProps {
//   owner: string;
//   repos: string[];
//   onClick?: () => void;
// }

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
}));

interface GitHubSemaphoreDialogProps {
  open: boolean;
  onClose: () => void;
  entities?: Entity[];
}

export const DependabotSemaphoreDialog: React.FC<GitHubSemaphoreDialogProps> = ({
  open,
  onClose,
  entities = [],
}) => {
  const classes = useStyles();
  const techInsightsApi = useApi(techInsightsApiRef);
  const githubASUtils = React.useMemo(
    () => new GithubAdvancedSecurityUtils(),
    [],
  );

  const [data, setData] = React.useState<SemaphoreData>({
    color: 'gray',
    metrics: {},
    summary: 'No data available for this metric.',
    details: [],
  });
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || entities.length === 0) return;

    setIsLoading(true);

    const fetchSecurityData = async () => {
      try {
        const results = await Promise.all(
          entities.map(entity =>
            githubASUtils.getGitHubSecurityFacts(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            }),
          ),
        );

        let critical = 0,
          high = 0,
          medium = 0,
          low = 0;
        const details: IssueDetail[] = [];

        results.forEach(result => {
          Object.values(result.codeScanningAlerts || {}).forEach(alert => {
            const a = alert as any;

            const severity = (a.severity as Severity) || 'medium';
            if (severity === 'critical') critical++;
            else if (severity === 'high') high++;
            else if (severity === 'medium') medium++;
            else if (severity === 'low') low++;
            else medium++;

            const urlParts = (a.html_url || '').split('/');
            const repo =
              urlParts.indexOf('github.com') !== -1
                ? `${urlParts[4]}/${urlParts[5]}`
                : '';

            details.push({
              severity,
              description: repo ? `[${repo}] ${a.description}` : a.description,
              component: a.location?.path,
              url: a.html_url,
              directLink: a.direct_link,
            });
          });

          Object.values(result.secretScanningAlerts || {}).forEach(alert => {
            const a = alert as any;
            high++;

            const urlParts = (a.html_url || '').split('/');
            const repo =
              urlParts.indexOf('github.com') !== -1
                ? `${urlParts[4]}/${urlParts[5]}`
                : '';

            details.push({
              severity: 'high',
              description: repo ? `[${repo}] ${a.description}` : a.description,
              url: a.html_url,
            });
          });
        });

        const totalCode = results.reduce(
          (sum, r) => sum + r.openCodeScanningAlertCount,
          0,
        );
        const totalSecret = results.reduce(
          (sum, r) => sum + r.openSecretScanningAlertCount,
          0,
        );

        const color =
          critical > 0 || high > 0
            ? 'red'
            : medium > 0 || low > 0
            ? 'yellow'
            : 'green';

        const summary =
          color === 'red'
            ? 'Critical security issues require immediate attention.'
            : color === 'yellow'
            ? 'Security issues need to be addressed.'
            : 'No security issues found.';

        setData({
          color,
          metrics: {
            criticalIssues: critical,
            highIssues: high,
            mediumIssues: medium,
            lowIssues: low,
            totalIssues: totalCode + totalSecret,
            totalCodeScanningAlerts: totalCode,
            totalSecretScanningAlerts: totalSecret,
          },
          summary,
          details,
        });
      } catch (err) {
        console.error('GitHub Security fetch error:', err);
        setData({
          color: 'gray',
          metrics: {},
          summary: 'Failed to load GitHub Security data.',
          details: [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSecurityData();
  }, [open, entities, githubASUtils, techInsightsApi]);

  const renderMetrics = () => (
    <Grid container spacing={2}>
      {[
        ['Code Scanning Alerts', data.metrics.totalCodeScanningAlerts, 6],
        ['Secret Scanning Alerts', data.metrics.totalSecretScanningAlerts, 6],
        ['Critical', data.metrics.criticalIssues, 3, '#d32f2f'],
        ['High', data.metrics.highIssues, 3, '#f44336'],
        ['Medium', data.metrics.mediumIssues, 3, '#ff9800'],
        ['Low', data.metrics.lowIssues, 3, '#2196f3'],
      ].map(([label, value, size, color], i) => (
        <Grid item xs={size as GridSize} key={i}>
          <Paper className={classes.metricBox} elevation={1}>
            <Typography
              variant="h4"
              className={classes.metricValue}
              style={{ color: color as string | undefined }}
            >
              {value || 0}
            </Typography>
            <Typography className={classes.metricLabel}>{label}</Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <BaseSemaphoreDialog
      open={open}
      onClose={onClose}
      title="Dependabot Alerts and Security Issues"
      data={data}
      isLoading={isLoading}
      renderMetrics={renderMetrics}
    />
  );
};