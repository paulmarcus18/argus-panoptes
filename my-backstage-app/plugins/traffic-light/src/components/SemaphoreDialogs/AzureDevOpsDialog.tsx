import React from 'react';
import { Grid, Paper, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { BaseSemaphoreDialog } from './BaseSemaphoreDialogs';
import { getAzureDevOpsBugs } from '../utils'; //this is the utils.ts file, not the utils folder
import { SemaphoreData, IssueDetail, SemaphoreDialogProps } from './types';
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

export const AzureDevOpsSemaphoreDialog: React.FC<SemaphoreDialogProps> = ({
  open,
  onClose,
}) => {
  const classes = useStyles();
  const techInsightsApi = useApi(techInsightsApiRef);

  const [data, setData] = React.useState<SemaphoreData>({
    color: 'gray',
    metrics: {},
    summary: 'No data available for this metric.',
    details: [],
  });
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setIsLoading(true);

    const fetchAzureData = async () => {
      try {
        const bugCount = await getAzureDevOpsBugs();
        let color: 'green' | 'yellow' | 'red' | 'gray' = 'green';
        if (bugCount > 5) color = 'red';
        else if (bugCount > 0) color = 'yellow';

        const details: IssueDetail[] =
          bugCount > 0
            ? [
                {
                  severity: bugCount > 5 ? 'high' : 'medium',
                  description: `${bugCount} active bug(s) found in Azure DevOps.`,
                },
              ]
            : [];

        setData({
          color,
          metrics: { bugCount },
          summary:
            bugCount === 0
              ? 'No active bugs in Azure DevOps.'
              : `${bugCount} active bug(s) found.`,
          details,
        });
      } catch (err) {
        console.error('Azure DevOps fetch error:', err);
        setData({ color: 'gray', metrics: {}, summary: 'Failed to load Azure DevOps data.', details: [] });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAzureData();
  }, [open]);

  const renderMetrics = () => (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Paper className={classes.metricBox} elevation={1}>
          <Typography variant="h4" className={classes.metricValue}>
            {data.metrics.bugCount || 0}
          </Typography>
          <Typography className={classes.metricLabel}>Open Bugs</Typography>
        </Paper>
      </Grid>
    </Grid>
  );

  return (
    <BaseSemaphoreDialog
      open={open}
      onClose={onClose}
      title="Azure DevOps Bugs"
      data={data}
      isLoading={isLoading}
      renderMetrics={renderMetrics}
    />
  );
};
