import React from 'react';
import { Grid, Paper, Typography, Link } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { Entity } from '@backstage/catalog-model';
import { BaseSemaphoreDialog } from './BaseSemaphoreDialogs';
import { GithubAdvancedSecurityUtils } from '../../utils/githubAdvancedSecurityUtils';
import { SemaphoreData, IssueDetail, Severity } from './types';
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
}));

interface GitHubSemaphoreDialogProps {
  open: boolean;
  onClose: () => void;
  entities?: Entity[];
}

export const GitHubSemaphoreDialog: React.FC<GitHubSemaphoreDialogProps> = ({
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

  // Helper function to extract repository name from GitHub URL
  const extractRepoName = (url: string): string => {
    if (!url) return '';
    
    const urlParts = url.split('/');
    const repoIndex = urlParts.indexOf('github.com');
    
    if (repoIndex !== -1 && repoIndex + 2 < urlParts.length) {
      return `${urlParts[repoIndex + 1]}/${urlParts[repoIndex + 2]}`;
    }
    
    return '';
  };

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
          // Process code scanning alerts
          Object.values(result.codeScanningAlerts || {}).forEach(alert => {
            const a = alert as any;

            // Count by severity
            const severity = (a.severity as Severity) || 'medium';
            switch (severity) {
              case 'critical':
                critical++;
                break;
              case 'high':
                high++;
                break;
              case 'medium':
                medium++;
                break;
              case 'low':
                low++;
                break;
              default:
                medium++;
            }

            // Extract repository name from direct_link or html_url
            const repoName = extractRepoName(a.direct_link || a.html_url || '');

            // Add repository name to description if available
            const description = repoName
              ? `[${repoName}] ${a.description}`
              : a.description;

            details.push({
              severity,
              description,
              component: a.location?.path,
              url: a.html_url || a.direct_link, // Ensure url is always set for clickable links
              directLink: a.direct_link, // Use direct_link for more specific navigation
            });
          });

          // Process secret scanning alerts (most are high severity)
          Object.values(result.secretScanningAlerts || {}).forEach(alert => {
            const a = alert as any;
            high++;

            // Extract repository name from html_url
            const repoName = extractRepoName(a.html_url || '');

            // Add repository name to description if available
            const description = repoName
              ? `[${repoName}] ${a.description}`
              : a.description;

            details.push({
              severity: 'high',
              description,
              url: a.html_url, // Ensure url is set for clickable links
              directLink: a.html_url, // For secret scanning, html_url is the direct link
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

        // Determine color based on severity
        const color =
          critical > 0 || high > 0
            ? 'red'
            : medium > 0 || low > 0
            ? 'yellow'
            : 'green';

        // Create appropriate summary message
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

  // Custom issue renderer to handle clickable links
  const renderIssueDescription = (issue: IssueDetail) => {
    if (issue.directLink) {
      return (
        <Link
          href={issue.directLink}
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          underline="hover"
        >
          {issue.description}
        </Link>
      );
    }
    return issue.description;
  };

  return (
    <BaseSemaphoreDialog
      open={open}
      onClose={onClose}
      title="GitHub Advanced Security"
      data={data}
      isLoading={isLoading}
      renderMetrics={renderMetrics}
    />
  );
};