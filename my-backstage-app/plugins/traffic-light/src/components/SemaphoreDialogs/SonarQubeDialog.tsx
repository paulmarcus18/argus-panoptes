import React from 'react';
import { Grid, Paper, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { BaseSemaphoreDialog } from './BaseSemaphoreDialogs';
import { SonarCloudUtils } from '../../utils/sonarCloudUtils';
import { SemaphoreData, IssueDetail } from './types';
import { Entity } from '@backstage/catalog-model';

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

interface SonarSemaphoreDialogProps {
  open: boolean;
  onClose: () => void;
  entities?: Entity[];
}

export const SonarQubeSemaphoreDialog: React.FC<SonarSemaphoreDialogProps> = ({
  open,
  onClose,
  entities = [],
}) => {
  const classes = useStyles();
  const techInsightsApi = useApi(techInsightsApiRef);
  const sonarUtils = React.useMemo(() => new SonarCloudUtils(), [techInsightsApi]);

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

    const fetchSonarData = async () => {
      try {
        // Get SonarQube facts for all entities
        const results = await Promise.all(
          entities.map(entity =>
            sonarUtils.getSonarQubeFacts(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            }),
          ),
        );

        // Count totals
        const totals = results.reduce(
          (acc, r) => {
            acc.bugs += r.bugs || 0;
            acc.code_smells += r.code_smells || 0;
            acc.vulnerabilities += r.vulnerabilities || 0;
            acc.code_coverage = r.code_coverage || acc.code_coverage;
            acc.quality_gate = r.quality_gate || acc.quality_gate;
            return acc;
          },
          {
            bugs: 0,
            code_smells: 0,
            vulnerabilities: 0,
            code_coverage: '0%',
            quality_gate: '0%',
          } as Record<string, any>,
        );

        // Create details array from results
        const details: IssueDetail[] = [];
        
        // Add bug issues
        if (totals.bugs > 0) {
          details.push({
            severity: totals.bugs > 5 ? 'high' : 'medium',
            description: `${totals.bugs} bugs detected across projects`,
          });
        }

        // Add code smell issues
        if (totals.code_smells > 0) {
          details.push({
            severity: totals.code_smells > 50 ? 'medium' : 'low',
            description: `${totals.code_smells} code smells detected across projects`,
          });
        }

        // Add vulnerabilities issues
        if (totals.vulnerabilities > 0) {
          details.push({
            severity: 'high',
            description: `${totals.vulnerabilities} vulnerabilities need review`,
          });
        }

        // Determine the overall status color
        let color: 'red' | 'yellow' | 'green' | 'gray' = 'green';
        if (totals.bugs > 0 || totals.vulnerabilities > 0) {
          color = 'red';
        } else if (totals.code_smells > 10) {
          color = 'yellow';
        }

        // Create the summary
        let summary = 'Code quality is excellent with no significant issues.';
        if (color === 'red') {
          summary = 'Critical code quality issues require immediate attention.';
        } else if (color === 'yellow') {
          summary = 'Code quality issues need to be addressed before release.';
        }

        // Set the real data
        setData({ color, metrics: totals, summary, details });
      } catch (err) {
        console.error('SonarQube fetch error:', err);
        // Set default data in case of error
        setData({ color: 'gray', metrics: {}, summary: 'Failed to load SonarQube data.', details: [] });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSonarData();
  }, [open, entities, sonarUtils, techInsightsApi]);

  const renderMetrics = () => (
    <Grid container spacing={2}>
      <Grid item xs={4}>
        <Paper className={classes.metricBox} elevation={1}>
          <Typography variant="h4" className={classes.metricValue}>
            {data.metrics.bugs}
          </Typography>
          <Typography className={classes.metricLabel}>Bugs</Typography>
        </Paper>
      </Grid>
      <Grid item xs={4}>
        <Paper className={classes.metricBox} elevation={1}>
          <Typography variant="h4" className={classes.metricValue}>
            {data.metrics.code_smells}
          </Typography>
          <Typography className={classes.metricLabel}>Code Smells</Typography>
        </Paper>
      </Grid>
      <Grid item xs={4}>
        <Paper className={classes.metricBox} elevation={1}>
          <Typography variant="h4" className={classes.metricValue}>
            {data.metrics.vulnerabilities}
          </Typography>
          <Typography className={classes.metricLabel}>Vulnerabilities</Typography>
        </Paper>
      </Grid>
      <Grid item xs={6}>
        <Paper className={classes.metricBox} elevation={1}>
          <Typography variant="h4" className={classes.metricValue}>
            {data.metrics.coverage}
          </Typography>
          <Typography className={classes.metricLabel}>Test Coverage</Typography>
        </Paper>
      </Grid>
      <Grid item xs={6}>
        <Paper className={classes.metricBox} elevation={1}>
          <Typography variant="h4" className={classes.metricValue}>
            {data.metrics.technicalDebt}
          </Typography>
          <Typography className={classes.metricLabel}>Technical Debt</Typography>
        </Paper>
      </Grid>
    </Grid>
  );

  return (
    <BaseSemaphoreDialog
      open={open}
      onClose={onClose}
      title="SonarQube"
      data={data}
      isLoading={isLoading}
      renderMetrics={renderMetrics}
    />
  );
};