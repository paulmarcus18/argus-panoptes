import React from 'react';
import { Grid, Paper, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { Entity } from '@backstage/catalog-model';
import { BaseSemaphoreDialog } from './BaseSemaphoreDialogs';
import { BlackDuckUtils } from '../../utils/blackDuckUtils';
import {
  SemaphoreData,
  IssueDetail,
  Severity,
  SemaphoreDialogProps,
} from './types';
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

export const BlackDuckSemaphoreDialog: React.FC<SemaphoreDialogProps> = ({
  open,
  onClose,
  entities = [],
}) => {
  const classes = useStyles();
  const techInsightsApi = useApi(techInsightsApiRef);
  const blackDuckUtils = React.useMemo(() => new BlackDuckUtils(), []);

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

    const fetchBlackDuckData = async () => {
      try {
        const results = await Promise.all(
          entities.map(entity =>
            blackDuckUtils.getBlackDuckFacts(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            }),
          ),
        );

        // Aggregate vulnerability counts across all entities
        let totalComponents = 0;
        let vulnerableComponents = 0;
        let criticalVulnerabilities = 0;
        let highVulnerabilities = 0;
        let mediumVulnerabilities = 0;
        let lowVulnerabilities = 0;

        const details: IssueDetail[] = [];

        results.forEach(result => {
          totalComponents += result.totalComponents || 0;
          vulnerableComponents += result.vulnerableComponents || 0;
          criticalVulnerabilities += result.criticalVulnerabilities || 0;
          highVulnerabilities += result.highVulnerabilities || 0;
          mediumVulnerabilities += result.mediumVulnerabilities || 0;
          lowVulnerabilities += result.lowVulnerabilities || 0;

          // Process vulnerabilities to create detailed issues
          if (result.vulnerabilities) {
            result.vulnerabilities.forEach((vuln: any) => {
              const severity = mapBlackDuckSeverity(vuln.severity);

              details.push({
                severity,
                description:
                  vuln.description ||
                  `${vuln.vulnerabilityName} in ${vuln.componentName}`,
                component: vuln.componentName,
                url: vuln.vulnerabilityUrl,
              });
            });
          }

          // Add component-level issues if they exist
          if (result.vulnerableComponents > 0) {
            const componentSeverity = determineComponentSeverity(
              result.criticalVulnerabilities,
              result.highVulnerabilities,
              result.mediumVulnerabilities,
            );

            if (result.criticalVulnerabilities > 0) {
              details.push({
                severity: 'critical',
                description: `${result.criticalVulnerabilities} critical vulnerabilities found in components`,
              });
            }

            if (result.highVulnerabilities > 0) {
              details.push({
                severity: 'high',
                description: `${result.highVulnerabilities} high severity vulnerabilities found in components`,
              });
            }

            if (result.mediumVulnerabilities > 0) {
              details.push({
                severity: 'medium',
                description: `${result.mediumVulnerabilities} medium severity vulnerabilities found in components`,
              });
            }
          }
        });

        // Determine overall status color
        let color: 'red' | 'yellow' | 'green' | 'gray' = 'green';
        if (criticalVulnerabilities > 0 || highVulnerabilities > 5) {
          color = 'red';
        } else if (
          vulnerableComponents > 0 ||
          highVulnerabilities > 0 ||
          mediumVulnerabilities > 10
        ) {
          color = 'yellow';
        }

        // Create summary
        let summary =
          'All components are secure with no known vulnerabilities.';
        if (color === 'red') {
          summary = 'Critical vulnerabilities require immediate attention.';
        } else if (color === 'yellow') {
          summary =
            'Some components have known vulnerabilities that need attention.';
        }

        setData({
          color,
          metrics: {
            totalComponents,
            vulnerableComponents,
            criticalVulnerabilities,
            highVulnerabilities,
            mediumVulnerabilities,
            lowVulnerabilities,
          },
          summary,
          details: details.sort((a, b) => {
            // Sort by severity (critical > high > medium > low)
            const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return (
              (severityOrder[b.severity] || 0) -
              (severityOrder[a.severity] || 0)
            );
          }),
        });
      } catch (err) {
        console.error('BlackDuck fetch error:', err);
        setData({
          color: 'gray',
          metrics: {},
          summary: 'Failed to load BlackDuck data.',
          details: [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlackDuckData();
  }, [open, entities, blackDuckUtils, techInsightsApi]);

  const renderMetrics = () => (
    <Grid container spacing={2}>
      {[
        ['Vulnerable Components', data.metrics.vulnerableComponents, 6],
        ['Total Components', data.metrics.totalComponents, 6],
        ['Critical', data.metrics.criticalVulnerabilities, 3, '#d32f2f'],
        ['High', data.metrics.highVulnerabilities, 3, '#f44336'],
        ['Medium', data.metrics.mediumVulnerabilities, 3, '#ff9800'],
        ['Low', data.metrics.lowVulnerabilities, 3, '#2196f3'],
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
      title="BlackDuck"
      data={data}
      isLoading={isLoading}
      renderMetrics={renderMetrics}
    />
  );
};

// Helper function to map BlackDuck severity to our Severity type
const mapBlackDuckSeverity = (blackDuckSeverity: string): Severity => {
  const normalized = blackDuckSeverity?.toLowerCase();
  switch (normalized) {
    case 'critical':
      return 'critical';
    case 'high':
      return 'high';
    case 'medium':
    case 'moderate':
      return 'medium';
    case 'low':
    case 'minor':
      return 'low';
    default:
      return 'medium';
  }
};

// Helper function to determine component-level severity
const determineComponentSeverity = (
  critical: number,
  high: number,
  medium: number,
): Severity => {
  if (critical > 0) return 'critical';
  if (high > 0) return 'high';
  if (medium > 0) return 'medium';
  return 'low';
};
