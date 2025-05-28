// import React, { useEffect, useState } from 'react';
// import { Grid, Paper, Typography } from '@material-ui/core';
// import { useApi } from '@backstage/core-plugin-api';
// import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
// import { SonarCloudUtils } from '../../utils/sonarCloudUtils';
// import { BaseSemaphoreDialog, useStyles } from './BaseSemaphoreDialogs';
// import { SemaphoreDialogProps, SemaphoreData, IssueDetail } from './types';

// // Default data for SonarQube
// const defaultSonarData: SemaphoreData = {
//   color: 'gray',
//   metrics: {
//     bugs: 0,
//     code_smells: 0,
//     vulnerabilities: 0,
//     coverage: '0%',
//     duplications: '0%',
//     technicalDebt: '0d',
//   },
//   summary: 'No SonarQube data available.',
//   details: [],
// };

// export const SonarQubeDialog: React.FC<SemaphoreDialogProps> = ({
//   open,
//   onClose,
//   entities = [],
// }) => {
//   const techInsightsApi = useApi(techInsightsApiRef);
//   const classes = useStyles();
//   const [isLoading, setIsLoading] = useState(false);
//   const [data, setData] = useState<SemaphoreData>(defaultSonarData);

//   const sonarUtils = React.useMemo(
//     () => new SonarCloudUtils(),
//     [techInsightsApi],
//   );

//   useEffect(() => {
//     if (open && entities.length > 0) {
//       setIsLoading(true);

//       const fetchSonarQubeData = async () => {
//         try {
//           // Get SonarQube facts for all entities
//           const sonarQubeResults = await Promise.all(
//             entities.map(entity =>
//               sonarUtils.getSonarQubeFacts(techInsightsApi, {
//                 kind: entity.kind,
//                 namespace: entity.metadata.namespace || 'default',
//                 name: entity.metadata.name,
//               }),
//             ),
//           );

//           // Count totals
//           const totals = sonarQubeResults.reduce(
//             (acc, result) => {
//               acc.bugs += result.bugs || 0;
//               acc.code_smells += result.code_smells || 0;
//               acc.vulnerabilities += result.vulnerabilities || 0;
//               acc.coverage = result.coverage || '0%';
//               acc.duplications = result.duplications || '0%';
//               return acc;
//             },
//             {
//               bugs: 0,
//               code_smells: 0,
//               vulnerabilities: 0,
//               coverage: '0%',
//               duplications: '0%',
//               technicalDebt: '0d',
//             },
//           );

//           // Create details array from results
//           const details: IssueDetail[] = [];

//           // Add bug issues
//           if (totals.bugs > 0) {
//             details.push({
//               severity: totals.bugs > 5 ? 'high' : 'medium',
//               description: `${totals.bugs} bugs detected across projects`,
//             });
//           }

//           // Add code smell issues
//           if (totals.code_smells > 0) {
//             details.push({
//               severity: totals.code_smells > 50 ? 'medium' : 'low',
//               description: `${totals.code_smells} code smells detected across projects`,
//             });
//           }

//           // Add vulnerabilities issues
//           if (totals.vulnerabilities > 0) {
//             details.push({
//               severity: totals.vulnerabilities > 0 ? 'high' : 'medium',
//               description: `${totals.vulnerabilities} vulnerabilities need review`,
//             });
//           }

//           // Determine the overall status color
//           let color: 'red' | 'yellow' | 'green' | 'gray' = 'green';
//           if (totals.bugs > 0 || totals.vulnerabilities > 0) {
//             color = 'red';
//           } else if (totals.code_smells > 10) {
//             color = 'yellow';
//           }

//           // Create the summary
//           let summary = 'Code quality is excellent with no significant issues.';
//           if (color === 'red') {
//             summary = 'Critical code quality issues require immediate attention.';
//           } else if (color === 'yellow') {
//             summary = 'Code quality issues need to be addressed before release.';
//           }

//           // Set the data
//           setData({
//             color,
//             metrics: totals,
//             summary,
//             details,
//           });
//         } catch (err) {
//           console.error('Error fetching SonarQube data:', err);
//           // Fall back to default data if there's an error
//           setData(defaultSonarData);
//         } finally {
//           setIsLoading(false);
//         }
//       };

//       fetchSonarQubeData();
//     }
//   }, [open, entities, techInsightsApi]);

//   const renderMetrics = () => {
//     return (
//       <Grid container spacing={2}>
//         <Grid item xs={4}>
//           <Paper className={classes.metricBox} elevation={1}>
//             <Typography variant="h4" className={classes.metricValue}>
//               {data.metrics.bugs}
//             </Typography>
//             <Typography className={classes.metricLabel}>Bugs</Typography>
//           </Paper>
//         </Grid>
//         <Grid item xs={4}>
//           <Paper className={classes.metricBox} elevation={1}>
//             <Typography variant="h4" className={classes.metricValue}>
//               {data.metrics.code_smells}
//             </Typography>
//             <Typography className={classes.metricLabel}>
//               Code Smells
//             </Typography>
//           </Paper>
//         </Grid>
//         <Grid item xs={4}>
//           <Paper className={classes.metricBox} elevation={1}>
//             <Typography variant="h4" className={classes.metricValue}>
//               {data.metrics.vulnerabilities}
//             </Typography>
//             <Typography className={classes.metricLabel}>
//               Vulnerabilities
//             </Typography>
//           </Paper>
//         </Grid>
//         <Grid item xs={6}>
//           <Paper className={classes.metricBox} elevation={1}>
//             <Typography variant="h4" className={classes.metricValue}>
//               {data.metrics.coverage}
//             </Typography>
//             <Typography className={classes.metricLabel}>
//               Test Coverage
//             </Typography>
//           </Paper>
//         </Grid>
//         <Grid item xs={6}>
//           <Paper className={classes.metricBox} elevation={1}>
//             <Typography variant="h4" className={classes.metricValue}>
//               {data.metrics.technicalDebt}
//             </Typography>
//             <Typography className={classes.metricLabel}>
//               Technical Debt
//             </Typography>
//           </Paper>
//         </Grid>
//       </Grid>
//     );
//   };

//   return (
//     <BaseSemaphoreDialog
//       open={open}
//       onClose={onClose}
//       title="SonarQube"
//       data={data}
//       isLoading={isLoading}
//       renderMetrics={renderMetrics}
//     />
//   );
// };