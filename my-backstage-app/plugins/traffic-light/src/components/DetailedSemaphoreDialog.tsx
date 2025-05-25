import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  Divider,
  Chip,
  Grid,
  Paper,
  Link,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import WarningIcon from '@material-ui/icons/Warning';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import InfoIcon from '@material-ui/icons/Info';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { Entity } from '@backstage/catalog-model';
import { getGitHubSecurityFacts } from './utils';
import { getSonarQubeFacts } from '../utils/sonarCloudUtils';
import { processGitHubSecurityData, IssueDetail, Severity } from './dataProcessing/githubAdvancedSecurity_logic';


// Type for semaphore severity
//type Severity = 'critical' | 'high' | 'medium' | 'low';

// Type for issue details - extended with URL and directLink
// interface IssueDetail {
//   severity: Severity;
//   description: string;
//   component?: string;
//   url?: string;
//   directLink?: string;
// }


// Types for metrics data
interface SemaphoreData {
  color: 'red' | 'yellow' | 'green' | 'gray';
  metrics: Record<string, any>;
  summary: string;
  details: IssueDetail[];
}

// Type for mock metrics data
interface MockMetricsData {
  [key: string]: SemaphoreData;
}

const useStyles = makeStyles(theme => ({
  dialogPaper: {
    minWidth: '500px',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  statusCircle: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    marginRight: theme.spacing(1),
  },
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
  warningIcon: {
    color: theme.palette.warning.main,
    marginRight: theme.spacing(1),
  },
  errorIcon: {
    color: theme.palette.error.main,
    marginRight: theme.spacing(1),
  },
  successIcon: {
    color: theme.palette.success.main,
    marginRight: theme.spacing(1),
  },
  infoIcon: {
    color: theme.palette.info.main,
    marginRight: theme.spacing(1),
  },
  issueItem: {
    padding: theme.spacing(1, 1, 1, 2),
    marginBottom: theme.spacing(1),
    borderLeft: '4px solid', // We'll set the color dynamically
  },
  issueTitle: {
    fontWeight: 'bold',
  },
  issueLink: {
    color: 'inherit',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  chipContainer: {
    marginTop: theme.spacing(1),
    '& > *': {
      margin: theme.spacing(0.5),
    },
  },
  summarySection: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  loadingIndicator: {
    display: 'flex',
    justifyContent: 'center',
    padding: theme.spacing(4),
  },
}));

// Mock data for each semaphore type
const mockMetricsData: MockMetricsData = {
  Dependabot: {
    color: 'green',
    metrics: {
      updatedDependencies: 42,
      securityUpdates: 3,
      outdatedDependencies: 0,
    },
    summary:
      'All dependencies are up to date with no security vulnerabilities.',
    details: [],
  },
  BlackDuck: {
    color: 'yellow',
    metrics: {
      totalComponents: 187,
      vulnerableComponents: 5,
      criticalVulnerabilities: 0,
      highVulnerabilities: 2,
      mediumVulnerabilities: 3,
    },
    summary: 'Some components have known vulnerabilities that need attention.',
    details: [
      {
        severity: 'high',
        component: 'log4j:1.2.17',
        description: 'Remote code execution vulnerability',
      },
      {
        severity: 'high',
        component: 'spring-core:5.3.13',
        description: 'Privilege escalation vulnerability',
      },
      {
        severity: 'medium',
        component: 'jackson-databind:2.12.3',
        description: 'Deserialization vulnerability',
      },
    ],
  },
  'Github Advanced Security': {
    color: 'red',
    metrics: {
      totalIssues: 28,
      criticalIssues: 2,
      highIssues: 8,
      mediumIssues: 18,
    },
    summary: 'Critical security issues require immediate attention.',
    details: [
      {
        severity: 'critical',
        description: 'SQL Injection vulnerability in UserController.java:156',
      },
      {
        severity: 'critical',
        description: 'Cross-site scripting in ProfileView.jsx:78',
      },
      {
        severity: 'high',
        description:
          'Insecure direct object reference in OrderService.java:214',
      },
    ],
  },
  SonarQube: {
    color: 'yellow',
    metrics: {
      bugs: 3,
      code_smells: 76,
      vulnerabilities: 2,
      coverage: '68.4%',
      duplications: '5.2%',
      technicalDebt: '4d 2h',
    },
    summary: 'Code quality issues need to be addressed before release.',
    details: [
      { severity: 'medium', description: 'Fix 3 bugs in UserService.java' },
      {
        severity: 'medium',
        description: 'Review 2 vulnerabilities in AuthenticationManager.java',
      },
      {
        severity: 'low',
        description: 'Address code smells in multiple components',
      },
    ],
  },
  // Other semaphore types remain unchanged
  CodeScene: {
    // unchanged...
    color: 'green',
    metrics: {
      codeHealthIndex: 8.7,
      technicalDebt: 'Low',
      hotspotFiles: 2,
      knowledgeLoss: 'Low',
    },
    summary: 'Codebase is healthy with a few minor issues.',
    details: [],
  },
  'Reporting Pipeline': {
    // unchanged...
    color: 'yellow',
    metrics: {
      failedJobs: 1,
      unstableJobs: 2,
      successJobs: 12,
      averageBuildTime: '8m 34s',
    },
    summary: 'Some pipeline jobs are failing or unstable.',
    details: [
      {
        severity: 'high',
        description: 'Daily data aggregation job failed - timeout error',
      },
      {
        severity: 'medium',
        description: 'Weekly report generation is unstable',
      },
    ],
  },
  'Pre-Production pipelines': {
    // unchanged...
    color: 'green',
    metrics: {
      deployments: {
        successful: 14,
        failed: 0,
        lastDeployment: '2 hours ago',
      },
      environments: {
        dev: 'OK',
        test: 'OK',
        staging: 'OK',
      },
    },
    summary: 'All pre-production environments are healthy and operational.',
    details: [],
  },
  'Foundation Pipelines': {
    // unchanged...
    color: 'red',
    metrics: {
      failedJobs: 3,
      successfulJobs: 5,
      waitingJobs: 2,
      uptime: '92.7%',
    },
    summary: 'Critical foundation pipelines are failing.',
    details: [
      {
        severity: 'critical',
        description:
          'Infrastructure provisioning pipeline failing - IAM permissions issue',
      },
      {
        severity: 'high',
        description: 'Database backup job failing - disk space issue',
      },
      {
        severity: 'high',
        description: 'Monitoring pipeline failing - configuration error',
      },
    ],
  },
};

interface DetailedSemaphoreDialogProps {
  open: boolean;
  onClose: () => void;
  semaphoreType: string;
  entities?: Entity[];
}

// Utility function to extract repository and file path from the direct_link
const extractInfoFromDirectLink = (directLink: string): { repoName: string; filePath: string } => {
  const result = { repoName: '', filePath: '' };
  
  if (!directLink) return result;
  
  try {
    // Format is usually: https://github.com/{owner}/{repo}/blob/{commit}/{path}#L{line}
    const url = new URL(directLink);
    const pathParts = url.pathname.split('/');
    
    if (url.hostname === 'github.com' && pathParts.length >= 5) {
      // Extract owner/repo
      result.repoName = `${pathParts[1]}/${pathParts[2]}`;
      
      // Extract file path - everything after the /blob/{commit}/ part
      if (pathParts[3] === 'blob' && pathParts.length > 5) {
        result.filePath = pathParts.slice(5).join('/');
      }
    }
  } catch (e) {
    // If URL parsing fails, return empty strings
    console.error('Failed to parse direct_link:', e);
  }
  
  return result;
};

const DetailedSemaphoreDialog: React.FC<DetailedSemaphoreDialogProps> = ({
  open,
  onClose,
  semaphoreType,
  entities = [],
}) => {
  const classes = useStyles();
  const techInsightsApi = useApi(techInsightsApiRef);

  // Get mock data based on semaphore type (or placeholder if not found)
  const defaultData: SemaphoreData = {
    color: 'gray',
    metrics: {},
    summary: 'No data available for this metric.',
    details: [],
  };

  // State to store real SonarQube data
  const [realSonarQubeData, setRealSonarQubeData] =
    React.useState<SemaphoreData | null>(null);
    
  // State to store real GitHub Security data
  const [realGitHubSecurityData, setRealGitHubSecurityData] =
    React.useState<SemaphoreData | null>(null);
    
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Fetch real SonarQube data when needed
  React.useEffect(() => {
    // Only fetch data if this is a SonarQube semaphore and there are entities
    if (semaphoreType === 'SonarQube' && entities && entities.length > 0) {
      setIsLoading(true);

      const fetchSonarQubeData = async () => {
        try {
          // Get SonarQube facts for all entities
          const sonarQubeResults = await Promise.all(
            entities.map(entity =>
              getSonarQubeFacts(techInsightsApi, {
                kind: entity.kind,
                namespace: entity.metadata.namespace || 'default',
                name: entity.metadata.name,
              }),
            ),
          );

          // Count totals
          const totals = sonarQubeResults.reduce(
            (acc, result) => {
              acc.bugs += result.bugs || 0;
              acc.code_smells += result.code_smells || 0;
              acc.vulnerabilities += result.vulnerabilities || 0;
              acc.coverage = result.coverage || '0%';
              acc.duplications = result.duplications || '0%';
              return acc;
            },
            {
              bugs: 0,
              code_smells: 0,
              vulnerabilities: 0,
              coverage: '0%',
              duplications: '0%',
              technicalDebt: '0d',
            },
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
              severity: totals.vulnerabilities > 0 ? 'high' : 'medium',
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
            summary =
              'Critical code quality issues require immediate attention.';
          } else if (color === 'yellow') {
            summary =
              'Code quality issues need to be addressed before release.';
          }

          // Set the real data
          setRealSonarQubeData({
            color,
            metrics: totals,
            summary,
            details,
          });
        } catch (err) {
          console.error('Error fetching SonarQube data:', err);
          // Fall back to mock data if there's an error
          setRealSonarQubeData(null);
        } finally {
          setIsLoading(false);
        }
      };

      fetchSonarQubeData();
    }
  }, [semaphoreType, entities, techInsightsApi]);

  // Fetch and process real GitHub Security data when needed
React.useEffect(() => {
  // Only fetch data if this is a GitHub Advanced Security semaphore and there are entities
  if (semaphoreType === 'Github Advanced Security' && entities && entities.length > 0) {
    setIsLoading(true);

    const fetchGitHubSecurityData = async () => {
      try {
        // Use the imported utility function to process GitHub security data
        const processedData = await processGitHubSecurityData(techInsightsApi, entities);
        
        // The utility function already handles all the processing logic
        // Just set the returned data directly
        setRealGitHubSecurityData({
          color: processedData.color,
          metrics: processedData.metrics,
          summary: processedData.summary,
          details: processedData.details
        });
      } catch (err) {
        console.error('Error fetching GitHub Security data:', err);
        setRealGitHubSecurityData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGitHubSecurityData();
  }
}, [semaphoreType, entities, techInsightsApi]);

  // Use real data if available, otherwise fall back to mock data
  const data = React.useMemo(() => {
    if (semaphoreType === 'SonarQube' && realSonarQubeData) {
      return realSonarQubeData;
    } else if (semaphoreType === 'Github Advanced Security' && realGitHubSecurityData) {
      return realGitHubSecurityData;
    }
    return mockMetricsData[semaphoreType] || defaultData;
  }, [semaphoreType, realSonarQubeData, realGitHubSecurityData]);

  const getStatusIcon = (color: string) => {
    switch (color) {
      case 'red':
        return <ErrorIcon className={classes.errorIcon} />;
      case 'yellow':
        return <WarningIcon className={classes.warningIcon} />;
      case 'green':
        return <CheckCircleIcon className={classes.successIcon} />;
      default:
        return <InfoIcon className={classes.infoIcon} />;
    }
  };

  const getSeverityColorHex = (severity: Severity): string => {
    switch (severity) {
      case 'critical':
        return '#d32f2f'; // error.main
      case 'high':
        return '#f44336'; // error.light
      case 'medium':
        return '#ff9800'; // warning.main
      case 'low':
        return '#2196f3'; // info.main
      default:
        return '#757575'; // text.secondary
    }
  };

  const renderMetrics = () => {
    // Render different metrics based on semaphore type
    switch (semaphoreType) {
      case 'SonarQube':
        return (
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
                <Typography className={classes.metricLabel}>
                  Code Smells
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper className={classes.metricBox} elevation={1}>
                <Typography variant="h4" className={classes.metricValue}>
                  {data.metrics.vulnerabilities}
                </Typography>
                <Typography className={classes.metricLabel}>
                  Vulnerabilities
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper className={classes.metricBox} elevation={1}>
                <Typography variant="h4" className={classes.metricValue}>
                  {data.metrics.coverage}
                </Typography>
                <Typography className={classes.metricLabel}>
                  Test Coverage
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper className={classes.metricBox} elevation={1}>
                <Typography variant="h4" className={classes.metricValue}>
                  {data.metrics.technicalDebt}
                </Typography>
                <Typography className={classes.metricLabel}>
                  Technical Debt
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        );

      case 'BlackDuck':
        return (
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Paper className={classes.metricBox} elevation={1}>
                <Typography variant="h4" className={classes.metricValue}>
                  {data.metrics.vulnerableComponents}
                </Typography>
                <Typography className={classes.metricLabel}>
                  Vulnerable Components
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper className={classes.metricBox} elevation={1}>
                <Typography variant="h4" className={classes.metricValue}>
                  {data.metrics.totalComponents}
                </Typography>
                <Typography className={classes.metricLabel}>
                  Total Components
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper className={classes.metricBox} elevation={1}>
                <Typography variant="h4" className={classes.metricValue}>
                  {data.metrics.criticalVulnerabilities}
                </Typography>
                <Typography className={classes.metricLabel}>
                  Critical
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper className={classes.metricBox} elevation={1}>
                <Typography variant="h4" className={classes.metricValue}>
                  {data.metrics.highVulnerabilities}
                </Typography>
                <Typography className={classes.metricLabel}>High</Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper className={classes.metricBox} elevation={1}>
                <Typography variant="h4" className={classes.metricValue}>
                  {data.metrics.mediumVulnerabilities}
                </Typography>
                <Typography className={classes.metricLabel}>Medium</Typography>
              </Paper>
            </Grid>
          </Grid>
        );

      case 'Github Advanced Security':
        return (
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Paper className={classes.metricBox} elevation={1}>
                <Typography variant="h4" className={classes.metricValue}>
                  {data.metrics.totalCodeScanningAlerts || 0}
                </Typography>
                <Typography className={classes.metricLabel}>
                  Code Scanning Alerts
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper className={classes.metricBox} elevation={1}>
                <Typography variant="h4" className={classes.metricValue}>
                  {data.metrics.totalSecretScanningAlerts || 0}
                </Typography>
                <Typography className={classes.metricLabel}>
                  Secret Scanning Alerts
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={3}>
              <Paper className={classes.metricBox} elevation={1}>
                <Typography
                  variant="h4"
                  className={classes.metricValue}
                  style={{ color: '#d32f2f' }}
                >
                  {data.metrics.criticalIssues || 0}
                </Typography>
                <Typography className={classes.metricLabel}>
                  Critical
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={3}>
              <Paper className={classes.metricBox} elevation={1}>
                <Typography
                  variant="h4"
                  className={classes.metricValue}
                  style={{ color: '#f44336' }}
                >
                  {data.metrics.highIssues || 0}
                </Typography>
                <Typography className={classes.metricLabel}>High</Typography>
              </Paper>
            </Grid>
            <Grid item xs={3}>
              <Paper className={classes.metricBox} elevation={1}>
                <Typography
                  variant="h4"
                  className={classes.metricValue}
                  style={{ color: '#ff9800' }}
                >
                  {data.metrics.mediumIssues || 0}
                </Typography>
                <Typography className={classes.metricLabel}>Medium</Typography>
              </Paper>
            </Grid>
            <Grid item xs={3}>
              <Paper className={classes.metricBox} elevation={1}>
                <Typography
                  variant="h4"
                  className={classes.metricValue}
                  style={{ color: '#2196f3' }}
                >
                  {data.metrics.lowIssues || 0}
                </Typography>
                <Typography className={classes.metricLabel}>Low</Typography>
              </Paper>
            </Grid>
          </Grid>
        );

      // Handle other semaphore types with their specific metrics
      default:
        // Generic metrics rendering for other types
        return (
          <Grid container spacing={2}>
            {Object.entries(data.metrics).map(([key, value], index) => {
              // Handle nested objects (like in Pre-Production pipelines)
              if (typeof value === 'object' && value !== null) {
                return (
                  <Grid item xs={12} sm={6} key={key}>
                    <Paper className={classes.metricBox} elevation={1}>
                      <Typography
                        variant="subtitle1"
                        className={classes.issueTitle}
                      >
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </Typography>
                      <Box mt={1}>
                        {Object.entries(value).map(([subKey, subValue]) => (
                          <Typography key={subKey} variant="body2">
                            <strong>{subKey}:</strong> {subValue}
                          </Typography>
                        ))}
                      </Box>
                    </Paper>
                  </Grid>
                );
              }

              return (
                <Grid item xs={6} md={4} key={key}>
                  <Paper className={classes.metricBox} elevation={1}>
                    <Typography variant="h4" className={classes.metricValue}>
                      {value}
                    </Typography>
                    <Typography className={classes.metricLabel}>
                      {key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, str => str.toUpperCase())}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="semaphore-details-dialog"
      classes={{ paper: classes.dialogPaper }}
      maxWidth="md"
    >
      <DialogTitle id="semaphore-details-dialog">
        <div className={classes.statusIndicator}>
          <Box className={classes.statusCircle} bgcolor={data.color} />
          <Typography variant="h6">{semaphoreType} Status</Typography>
        </div>
      </DialogTitle>

      <DialogContent>
        {isLoading ? (
          <Box className={classes.loadingIndicator}>
            <Typography>Loading data...</Typography>
          </Box>
        ) : (
          <>
            {/* Summary section */}
            <Paper
              className={classes.summarySection}
              elevation={0}
              variant="outlined"
            >
              <Box display="flex" alignItems="center">
                {getStatusIcon(data.color)}
                <Typography variant="body1">{data.summary}</Typography>
              </Box>
            </Paper>

            {/* Metrics section */}
            {renderMetrics()}

            {/* Details/Issues section */}
            {data.details && data.details.length > 0 && (
              <>
                <Box mt={3} mb={1}>
                  <Typography variant="h6">Issues</Typography>
                  <Divider />
                </Box>

                <List>
                  {data.details
                    .slice() // Create a copy of the array to avoid modifying the original
                    .sort((a, b) => {
                      // Sort by severity (critical > high > medium > low)
                      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                      return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
                    })
                    .map((issue, index) => {
                    // Get appropriate color for the border based on severity
                    const borderColor = getSeverityColorHex(issue.severity);
                    
                    return (
                      <Paper 
                        key={index} 
                        className={classes.issueItem} 
                        elevation={0}
                        style={{ borderLeftColor: borderColor }}
                      >
                        <Typography
                          variant="subtitle1"
                          className={classes.issueTitle}
                        >
                          {issue.directLink ? (
                            <Link
                              href={issue.directLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={classes.issueLink}
                            >
                              {issue.description}
                            </Link>
                          ) : (
                            issue.description
                          )}
                        </Typography>
                        <Box className={classes.chipContainer}>
                          <Chip
                            size="small"
                            label={issue.severity}
                            style={{
                              backgroundColor: getSeverityColorHex(issue.severity),
                              color: '#fff',
                            }}
                          />
                          {issue.component && (
                            <Chip
                              size="small"
                              label={issue.component}
                              variant="outlined"
                            />
                          )}
                          {issue.created_at && (
                            <Chip
                              size="small"
                              label={new Date(issue.created_at).toLocaleDateString()}
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Paper>
                    );
                  })}
                </List>
              </>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DetailedSemaphoreDialog;
