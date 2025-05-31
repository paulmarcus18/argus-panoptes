// import React from 'react';
// import { Grid, Paper, Typography } from '@material-ui/core';
// import { makeStyles } from '@material-ui/core/styles';
// import { useApi } from '@backstage/core-plugin-api';
// import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
// import { Entity } from '@backstage/catalog-model';
// import { BaseSemaphoreDialog } from './BaseSemaphoreDialogs';
// import { DependabotUtils } from '../../utils/dependabotUtils';
// import { SemaphoreData, IssueDetail, Severity } from './types';
// import type { GridSize } from '@material-ui/core';


//     // Filter systems based on search term
//   // useEffect(() => {
//   //   const fetchTopRepos = async () => {
//   //     if (!detailedDialogOpen || currentSemaphoreType !== 'Dependabot') return;
//   //     if (selectedEntities.length === 0) return;
  
//   //     try {
//   //       const top5 = await getTop5CriticalDependabotRepos(techInsightsApi, selectedEntities);
//   //       setTopCriticalRepos(top5);
//   //     } catch (e) {
//   //       console.error('❌ Failed to fetch top critical repos', e);
//   //     }
//   //   };
  
//   //   fetchTopRepos();
//   // }, [
//   //   detailedDialogOpen,
//   //   currentSemaphoreType,
//   //   selectedEntities,  // ✅ ensures updates when filters change
//   //   techInsightsApi,
//   // ]);



//   // useEffect(() => {
//   //   const fetchTopRepos = async () => {
//   //     if (!detailedDialogOpen || currentSemaphoreType !== 'Dependabot') return;
//   //     if (selectedEntities.length === 0) return;
  
//   //     try {
//   //       const top5 = await getTop5CriticalDependabotRepos(techInsightsApi, selectedEntities);
//   //       setTopCriticalRepos(top5);
//   //     } catch (e) {
//   //       console.error('❌ Failed to fetch top critical repos', e);
//   //     }
//   //   };
  
//   //   fetchTopRepos();
//   // }, [
//   //   detailedDialogOpen,
//   //   currentSemaphoreType,
//   //   selectedEntities,  // ✅ ensures updates when filters change
//   //   techInsightsApi,
//   // ]);
//   // Dependabot traffic light component (existing implementation)
// // interface DependabotProps {
// //   owner: string;
// //   repos: string[];
// //   onClick?: () => void;
// // }

// const useStyles = makeStyles(theme => ({
//   metricBox: {
//     padding: theme.spacing(2),
//     marginBottom: theme.spacing(2),
//     display: 'flex',
//     flexDirection: 'column',
//   },
//   metricValue: {
//     fontWeight: 'bold',
//     fontSize: '22px',
//   },
//   metricLabel: {
//     color: theme.palette.text.secondary,
//   },
// }));

// interface DependabotSemaphoreDialogProps {
//   open: boolean;
//   onClose: () => void;
//   entities: Entity[];
//   system: string
// }

// export const DependabotSemaphoreDialog: React.FC<DependabotSemaphoreDialogProps> = ({
//   open,
//   onClose,
//   entities = [],
//   system,
// }) => {
//   const classes = useStyles();
//   const techInsightsApi = useApi(techInsightsApiRef);
//   const dependabotUtils = React.useMemo(
//       () => new DependabotUtils(),
//       [techInsightsApi],
//     );

//   const [data, setData] = React.useState<SemaphoreData>({
//     color: 'gray',
//     metrics: {},
//     summary: 'No data available for this metric.',
//     details: [],
//   });
//   const [isLoading, setIsLoading] = React.useState(false);

//   React.useEffect(() => {
//     if (!open || entities.length === 0) return;

//     setIsLoading(true);

//     const fetchAlertData = async () => {
//       try {
//         const results = await Promise.all(
//           entities.map(entity =>
//             dependabotUtils.getDependabotFacts(techInsightsApi, {
//               kind: entity.kind,
//               namespace: entity.metadata.namespace || 'default',
//               name: entity.metadata.name,
//             }),
//           ),
//         );

//         let critical = 0,
//           high = 0,
//           medium = 0,
//           low = 0;
//         const details: IssueDetail[] = [];

//         results.forEach(result => {
//           Object.values(result.criticalAlertsCount || {}).forEach(alert => {
//             const a = alert as any;

//             const severity = (a.severity as Severity) || 'medium';
//             if (severity === 'critical') critical++;
//             else if (severity === 'high') high++;
//             else if (severity === 'medium') medium++;
//             else if (severity === 'low') low++;
//             else medium++;

//             // const urlParts = (a.html_url || '').split('/');
//             // const repo =
//             //   urlParts.indexOf('github.com') !== -1
//             //     ? `${urlParts[4]}/${urlParts[5]}`
//             //     : '';

//             // details.push({
//             //   severity,
//             //   description: repo ? `[${repo}] ${a.description}` : a.description,
//             //   component: a.location?.path,
//             //   url: a.html_url,
//             //   directLink: a.direct_link,
//             // });
//           });

//           Object.values(result.highAlertsCount || {}).forEach(alert => {
//             const a = alert as any;
//             high++;

//             // const urlParts = (a.html_url || '').split('/');
//             // const repo =
//             //   urlParts.indexOf('github.com') !== -1
//             //     ? `${urlParts[4]}/${urlParts[5]}`
//             //     : '';

//             // details.push({
//             //   severity: 'high',
//             //   description: repo ? `[${repo}] ${a.description}` : a.description,
//             //   url: a.html_url,
//             // });
//           });
//         });

//         const totalCode = results.reduce(
//           (sum, r) => sum + r.openCodeScanningAlertCount,
//           0,
//         );
//         const totalSecret = results.reduce(
//           (sum, r) => sum + r.openSecretScanningAlertCount,
//           0,
//         );

//         const color =
//           critical > 0 || high > 0
//             ? 'red'
//             : medium > 0 || low > 0
//             ? 'yellow'
//             : 'green';

//         const summary =
//           color === 'red'
//             ? 'Critical security issues require immediate attention.'
//             : color === 'yellow'
//             ? 'Security issues need to be addressed.'
//             : 'No security issues found.';

//         setData({
//           color,
//           metrics: {
//             criticalIssues: critical,
//             highIssues: high,
//             mediumIssues: medium,
//             lowIssues: low,
//             totalIssues: totalCode + totalSecret,
//             totalCodeScanningAlerts: totalCode,
//             totalSecretScanningAlerts: totalSecret,
//           },
//           summary,
//           details,
//         });
//       } catch (err) {
//         console.error('Dependabot facts fetch error:', err);
//         setData({
//           color: 'gray',
//           metrics: {},
//           summary: 'Failed to load Dependabot data.',
//           details: [],
//         });
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchAlertData();
//   }, [open, entities, dependabotUtils, techInsightsApi]);

//   const renderMetrics = () => (
//     <Grid container spacing={2}>
//       {[
//         ['Code Scanning Alerts', data.metrics.totalCodeScanningAlerts, 6],
//         ['Secret Scanning Alerts', data.metrics.totalSecretScanningAlerts, 6],
//         ['Critical', data.metrics.criticalIssues, 3, '#d32f2f'],
//         ['High', data.metrics.highIssues, 3, '#f44336'],
//         ['Medium', data.metrics.mediumIssues, 3, '#ff9800'],
//         ['Low', data.metrics.lowIssues, 3, '#2196f3'],
//       ].map(([label, value, size, color], i) => (
//         <Grid item xs={size as GridSize} key={i}>
//           <Paper className={classes.metricBox} elevation={1}>
//             <Typography
//               variant="h4"
//               className={classes.metricValue}
//               style={{ color: color as string | undefined }}
//             >
//               {value || 0}
//             </Typography>
//             <Typography className={classes.metricLabel}>{label}</Typography>
//           </Paper>
//         </Grid>
//       ))}
//     </Grid>
//   );

//   return (
//     <BaseSemaphoreDialog
//       open={open}
//       onClose={onClose}
//       title="Dependabot Alerts and Security Issues"
//       data={data}
//       isLoading={isLoading}
//       renderMetrics={renderMetrics}
//     />
//   );
// };

import React from 'react';
import { Grid, Paper, Typography, List, ListItem, ListItemText } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { Entity } from '@backstage/catalog-model';
import { BaseSemaphoreDialog } from './BaseSemaphoreDialogs';
import { DependabotUtils, RepoAlertSummary } from '../../utils/dependabotUtils';
import { SemaphoreData, IssueDetail } from './types';
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
  topReposSection: {
    marginTop: theme.spacing(3),
  },
  repoItem: {
    borderLeft: `4px solid transparent`,
    marginBottom: theme.spacing(1),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
  },
  criticalRepo: {
    borderLeftColor: '#d32f2f',
  },
  highRepo: {
    borderLeftColor: '#f44336',
  },
  mediumRepo: {
    borderLeftColor: '#ff9800',
  },
  lowRepo: {
    borderLeftColor: '#2196f3',
  },
}));

interface DependabotSemaphoreDialogProps {
  open: boolean;
  onClose: () => void;
  entities: Entity[];
  system: string;
}

export const DependabotSemaphoreDialog: React.FC<DependabotSemaphoreDialogProps> = ({
  open,
  onClose,
  entities = [],
  system,
}) => {
  const classes = useStyles();
  const techInsightsApi = useApi(techInsightsApiRef);
  const dependabotUtils = React.useMemo(
    () => new DependabotUtils(),
    [techInsightsApi],
  );

  const [data, setData] = React.useState<SemaphoreData>({
    color: 'gray',
    metrics: {},
    summary: 'No data available for this metric.',
    details: [],
  });
  const [topRepos, setTopRepos] = React.useState<RepoAlertSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

React.useEffect(() => {
  if (!open || entities.length === 0) {
    console.log('[🔕] Dialog closed or no entities provided.');
    return;
  }

  console.log('[🚦] DependabotSemaphoreDialog opened with', entities.length, 'entities');
  setIsLoading(true);

  const fetchDependabotData = async () => {
    try {
      console.log('[📡] Fetching facts for all entities...');
      const results = await Promise.all(
        entities.map(async entity => {
          console.log(`↪️ Fetching facts for: ${entity.metadata.name}`);
          const facts = await dependabotUtils.getDependabotFacts(techInsightsApi, {
            kind: entity.kind,
            namespace: entity.metadata.namespace || 'default',
            name: entity.metadata.name,
          });
          console.log(`✅ Facts for ${entity.metadata.name}:`, facts);
          return { entity, facts };
        }),
      );

      // Calculate totals
      let totalCritical = 0;
      let totalHigh = 0;
      let totalMedium = 0;

      const repoSummaries: RepoAlertSummary[] = results.map(({ entity, facts }) => {
        const critical = facts.criticalAlertsCount || 0;
        const high = facts.highAlertsCount || 0;
        const medium = facts.mediumAlertsCount || 0;

        totalCritical += critical;
        totalHigh += high;
        totalMedium += medium;

        return {
          name: entity.metadata.name,
          critical,
          high,
          medium,
        };
      });

      console.log('[📊] Aggregated alert counts:', {
        totalCritical,
        totalHigh,
        totalMedium,
      });

      // Get top 5 repos
      const top5Repos = await dependabotUtils.getTop5CriticalDependabotRepos(
        techInsightsApi,
        entities,
      );
      console.log('[🔥] Top 5 repos by critical/high/medium:', top5Repos);

      const color =
        totalCritical > 0 ? 'red' : totalHigh > 0 ? 'yellow' : totalMedium > 0 ? 'yellow' : 'green';

      const totalIssues = totalCritical + totalHigh + totalMedium;
      let summary = '';
      if (totalCritical > 0) {
        summary = `${totalCritical} critical issue${totalCritical !== 1 ? 's' : ''} require immediate attention.`;
      } else if (totalHigh > 0) {
        summary = `${totalHigh} high severity issue${totalHigh !== 1 ? 's' : ''} need to be addressed.`;
      } else if (totalMedium > 0) {
        summary = `${totalMedium} medium severity issue${totalMedium !== 1 ? 's' : ''} should be reviewed.`;
      } else {
        summary = 'No Dependabot security issues found.';
      }

      console.log('[🧾] Summary:', summary);

      setData({
        color,
        metrics: {
          criticalIssues: totalCritical,
          highIssues: totalHigh,
          mediumIssues: totalMedium,
          totalIssues,
          totalRepositories: entities.length,
        },
        summary,
        details: [],
      });

      setTopRepos(top5Repos);
    } catch (err) {
      console.error('❌ Dependabot data fetch error:', err);
      setData({
        color: 'gray',
        metrics: {},
        summary: 'Failed to load Dependabot data.',
        details: [],
      });
      setTopRepos([]);
    } finally {
      console.log('[✅] Fetching complete. Stopping loading...');
      setIsLoading(false);
    }
  };

  fetchDependabotData();
}, [open, entities, dependabotUtils, techInsightsApi]);


  const getRepoClassName = (repo: RepoAlertSummary) => {
    if (repo.critical > 0) return `${classes.repoItem} ${classes.criticalRepo}`;
    if (repo.high > 0) return `${classes.repoItem} ${classes.highRepo}`;
    if (repo.medium > 0) return `${classes.repoItem} ${classes.mediumRepo}`;
    return `${classes.repoItem} ${classes.lowRepo}`;
  };

  const renderMetrics = () => (
    <>
      <Grid container spacing={2}>
        {[
          ['Total Issues', data.metrics.totalIssues, 4, '#666'],
          ['Total Repositories', data.metrics.totalRepositories, 4, '#666'],
          ['Critical', data.metrics.criticalIssues, 4, '#d32f2f'],
          ['High', data.metrics.highIssues, 4, '#f44336'],
          ['Medium', data.metrics.mediumIssues, 4, '#ff9800'],
        ].map(([label, value, size, color], i) => (
          <Grid item xs={size as GridSize} key={i}>
            <Paper className={classes.metricBox} elevation={1}>
              <Typography
                variant="h4"
                className={classes.metricValue}
                style={{ color: color as string }}
              >
                {value || 0}
              </Typography>
              <Typography className={classes.metricLabel}>{label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {topRepos.length > 0 && (
        <div className={classes.topReposSection}>
          <Typography variant="h6" gutterBottom>
            Top 5 Repositories by Priority
          </Typography>
          <List>
            {topRepos.map((repo, index) => (
              <ListItem key={repo.name} className={getRepoClassName(repo)}>
                <ListItemText
                  primary={`${index + 1}. ${repo.name}`}
                  secondary={
                    <span>
                      {repo.critical > 0 && (
                        <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                          Critical: {repo.critical}
                        </span>
                      )}
                      {repo.critical > 0 && (repo.high > 0 || repo.medium > 0) && ' | '}
                      {repo.high > 0 && (
                        <span style={{ color: '#f44336', fontWeight: 'bold' }}>
                          High: {repo.high}
                        </span>
                      )}
                      {repo.high > 0 && repo.medium > 0 && ' | '}
                      {repo.medium > 0 && (
                        <span style={{ color: '#ff9800', fontWeight: 'bold' }}>
                          Medium: {repo.medium}
                        </span>
                      )}
                      {repo.critical === 0 && repo.high === 0 && repo.medium === 0 && (
                        <span style={{ color: '#4caf50' }}>No issues found</span>
                      )}
                    </span>
                  }
                />
              </ListItem>
            ))}
          </List>
        </div>
      )}
    </>
  );

  return (
    <BaseSemaphoreDialog
      open={open}
      onClose={onClose}
      title={`Dependabot Security Alerts${system !== 'all' ? ` - ${system}` : ''}`}
      data={data}
      isLoading={isLoading}
      renderMetrics={renderMetrics}
    />
  );
};