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
  projectList: {
    marginTop: theme.spacing(3),
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
  const [projectBugs, setProjectBugs] = React.useState<
    { project: string; bugCount: number; url: string }[]
  >([]);

  React.useEffect(() => {
    if (!open || entities.length === 0) return;

    setIsLoading(true);

    const fetchBugMetrics = async () => {
      try {
        const projectBugMap = new Map<
          string,
          { bugCount: number; url: string }
        >();

        for (const entity of entities) {
          const ref = {
            kind: entity.kind,
            namespace: entity.metadata.namespace || 'default',
            name: entity.metadata.name,
          };

          const projectName =
            entity.metadata.annotations?.['azure.com/project'] ?? 'unknown';

          if (!projectBugMap.has(projectName) && projectName !== 'unknown') {
            const metrics = await azureUtils.getAzureDevOpsBugFacts(
              techInsightsApi,
              ref,
            );

            const orgName =
              entity.metadata.annotations?.['azure.com/organization'] ?? 'unknown-org';
            const queryId =
              entity.metadata.annotations?.['azure.com/bugs-query-id'] ?? 'unknown-query-id';

            const projectUrl = `https://dev.azure.com/${orgName}/${projectName}/_queries/query/${queryId}/`;
            

            projectBugMap.set(projectName, {
              bugCount: metrics.azureBugCount,
              url: projectUrl,
            });
          }
        }

        const projectList = Array.from(projectBugMap.entries())
          .map(([project, { bugCount, url }]) => ({
            project,
            bugCount,
            url,
          }))
          .sort((a, b) => b.bugCount - a.bugCount);

        setProjectBugs(projectList);
      } catch (e) {
        console.error('❌ Failed to fetch Azure DevOps bug data:', e);
        setProjectBugs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBugMetrics();
  }, [open, entities, techInsightsApi, azureUtils]);

  const totalBugCount = projectBugs.reduce((sum, p) => sum + p.bugCount, 0);
  const top5Projects = projectBugs.slice(0, 5);

  const renderMetrics = () => (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper className={classes.metricBox} elevation={1}>
            <Typography
              variant="h4"
              className={classes.metricValue}
              style={{ color: '#e53935' }}
            >
              {totalBugCount}
            </Typography>
            <Typography className={classes.metricLabel}>
              Total Azure DevOps Bugs
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {top5Projects.length > 0 && (
        <div className={classes.projectList}>
          <Typography variant="h6">Projects with Most Bugs</Typography>
          <Grid container spacing={2} className={classes.projectList}>
            {top5Projects.map(project => (
              <Grid item xs={12} key={project.project}>
                <Paper className={classes.metricBox} elevation={1}>
                  <Link
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={classes.metricValue}
                  >
                    {project.project}
                  </Link>
                  <Typography className={classes.metricLabel}>
                    Bugs: {project.bugCount}
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
      title="Azure Bug Insights"
      data={{ color: 'gray', summary: '', metrics: {}, details: [] }}
      isLoading={isLoading}
      renderMetrics={renderMetrics}
    />
  );
};
