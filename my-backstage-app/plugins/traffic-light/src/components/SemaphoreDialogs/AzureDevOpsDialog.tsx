import React from 'react';
import {
  Grid,
  Paper,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { Entity } from '@backstage/catalog-model';
import { BaseSemaphoreDialog } from './BaseSemaphoreDialogs';
import { AzureUtils } from '../../utils/azureUtils';

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

interface AzureBugInsightsDialogProps {
  open: boolean;
  onClose: () => void;
  entities?: Entity[];
}

export const AzureDevOpsSemaphoreDialog: React.FC<AzureBugInsightsDialogProps> = ({
  open,
  onClose,
  entities = [],
}) => {
  const classes = useStyles();
  const techInsightsApi = useApi(techInsightsApiRef);
  const azureUtils = React.useMemo(() => new AzureUtils(), []);
  const [isLoading, setIsLoading] = React.useState(false);
  const [totalUniqueProjectBugCount, setTotalUniqueProjectBugCount] = React.useState(0);

  React.useEffect(() => {
    if (!open || entities.length === 0) return;

    setIsLoading(true);

    const fetchBugMetrics = async () => {
      try {
        const projectBugMap: Record<string, number> = {};

        for (const entity of entities) {
          const ref = {
            kind: entity.kind,
            namespace: entity.metadata.namespace || 'default',
            name: entity.metadata.name,
          };

          const projectName =
            entity.metadata.annotations?.['azure.com/project'] ?? 'unknown';

          if (!(projectName in projectBugMap) && projectName !== 'unknown') {
            const metrics = await azureUtils.getAzureDevOpsBugFacts(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            });
            projectBugMap[projectName] = metrics.azureBugCount;
            console.log(
              `🔍 Fetched Azure DevOps bug count for project "${projectName}": ${metrics.azureBugCount}`,)
          }
        }

        const totalBugCount = Object.values(projectBugMap).reduce(
          (sum, count) => sum + count,
          0,
        );

        setTotalUniqueProjectBugCount(totalBugCount);
      } catch (e) {
        console.error('❌ Failed to fetch Azure DevOps bug data:', e);
        setTotalUniqueProjectBugCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBugMetrics();
  }, [open, entities, techInsightsApi, azureUtils]);

  const renderMetrics = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Paper className={classes.metricBox} elevation={1}>
          <Typography
            variant="h4"
            className={classes.metricValue}
            style={{ color: '#e53935' }}
          >
            {totalUniqueProjectBugCount}
          </Typography>
          <Typography className={classes.metricLabel}>
            Total Azure DevOps Bugs (Unique Projects Only)
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );

  return (
    <BaseSemaphoreDialog
      open={open}
      onClose={onClose}
      title="Azure Bug Insights"
      data={{ color: 'gray', summary: '', metrics: {}, details: [] }}
      isLoading={isLoading}
      renderMetrics={renderMetrics}
    />
  );
};
