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
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import WarningIcon from '@material-ui/icons/Warning';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import InfoIcon from '@material-ui/icons/Info';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { Entity } from '@backstage/catalog-model';
import { getSonarQubeFacts } from './utils';

// Type for semaphore severity
type Severity = 'critical' | 'high' | 'medium' | 'low';

// Type for issue details
interface IssueDetail {
  severity: Severity;
  description: string;
  component?: string;
  repository?: string;
}

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

// Type for SonarQube metrics per repository
interface SonarQubeRepoData {
  name: string;
  bugs: number;
  code_smells: number;
  vulnerabilities: number;
  code_coverage: number;
  quality_gate: string;
  color: 'red' | 'yellow' | 'green' | 'gray';
  details: IssueDetail[];
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
    borderLeft: `4px solid ${theme.palette.error.main}`,
    padding: theme.spacing(1, 1, 1, 2),
    marginBottom: theme.spacing(1),
  },
  issueTitle: {
    fontWeight: 'bold',
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
  repoSelect: {
    minWidth: 200,
    marginBottom: theme.spacing(2),
  },
  filterContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  alertBox: {
    padding: theme.spacing(1),
    marginBottom: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: theme.spacing(1),
  },
}));

// Mock data (only used as fallback)
const mockMetricsData: MockMetricsData = {
  SonarQube: {
    color: 'yellow',
    metrics: {
      bugs: 3,
      code_smells: 76,
      vulnerabilities: 2,
      code_coverage: 68.4,
      quality_gate: 'WARN',
      technical_debt: '4d 2h',
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
};

interface DetailedSemaphoreDialogProps {
  open: boolean;
  onClose: () => void;
  semaphoreType: string;
  entities?: Entity[];
}

const DetailedSemaphoreDialog: React.FC<DetailedSemaphoreDialogProps> = ({
  open,
  onClose,
  semaphoreType,
  entities = [],
}) => {
  const classes = useStyles();
  const techInsightsApi = useApi(techInsightsApiRef);

  // State for repository data and selected repository
  const [repoData, setRepoData] = React.useState<SonarQubeRepoData[]>([]);
  const [selectedRepo, setSelectedRepo] = React.useState<string>('allRepos');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Get default data based on semaphore type (fallback if API fails)
  const defaultData: SemaphoreData = {
    color: 'gray',
    metrics: {},
    summary: 'No data available for this metric.',
    details: [],
  };

  // Fetch real SonarQube data when needed
  React.useEffect(() => {
    // Only fetch data if this is a SonarQube semaphore and there are entities
    if (semaphoreType === 'SonarQube' && entities && entities.length > 0) {
      setIsLoading(true);

      const fetchSonarQubeData = async () => {
        try {
          // Get SonarQube facts for all entities
          const sonarQubeResults = await Promise.all(
            entities.map(async entity => {
              const sonarData = await getSonarQubeFacts(techInsightsApi, {
                kind: entity.kind,
                namespace: entity.metadata.namespace || 'default',
                name: entity.metadata.name,
              });

              return {
                name: entity.metadata.name,
                ...sonarData,
              };
            }),
          );

          // Process each repository's data
          const processedRepoData = sonarQubeResults.map(repo => {
            // Create details array for this repo
            const details: IssueDetail[] = [];

            // Add bug issues
            if (repo.bugs > 0) {
              details.push({
                severity: repo.bugs > 5 ? 'high' : 'medium',
                description: `${repo.bugs} bugs detected`,
                repository: repo.name,
              });
            }

            // Add code smell issues
            if (repo.code_smells > 0) {
              details.push({
                severity: repo.code_smells > 50 ? 'medium' : 'low',
                description: `${repo.code_smells} code smells detected`,
                repository: repo.name,
              });
            }

            // Add vulnerabilities issues
            if (repo.vulnerabilities > 0) {
              details.push({
                severity: repo.vulnerabilities > 0 ? 'high' : 'medium',
                description: `${repo.vulnerabilities} vulnerabilities need review`,
                repository: repo.name,
              });
            }

            // Determine the overall status color
            let color: 'red' | 'yellow' | 'green' | 'gray' = 'green';
            if (
              repo.quality_gate === 'ERROR' ||
              repo.bugs > 0 ||
              repo.vulnerabilities > 0
            ) {
              color = 'red';
            } else if (repo.quality_gate === 'WARN' || repo.code_smells > 10) {
              color = 'yellow';
            } else if (repo.quality_gate === 'OK') {
              color = 'green';
            }

            return {
              ...repo,
              color,
              details,
            };
          });

          setRepoData(processedRepoData);
        } catch (err) {
          console.error('Error fetching SonarQube data:', err);
          // Keep an empty array if there's an error
          setRepoData([]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchSonarQubeData();
    }
  }, [semaphoreType, entities, techInsightsApi]);

  // Compute aggregated data for "All Repos" option
  const aggregatedData = React.useMemo(() => {
    if (repoData.length === 0) {
      return null;
    }

    // Count totals
    const totals = repoData.reduce(
      (acc, repo) => {
        acc.bugs += repo.bugs || 0;
        acc.code_smells += repo.code_smells || 0;
        acc.vulnerabilities += repo.vulnerabilities || 0;

        // For code coverage, calculate a weighted average
        if (repo.code_coverage) {
          acc.totalCoveragePoints += repo.code_coverage;
          acc.coverageCount += 1;
        }

        // Determine the worst quality gate status
        if (repo.quality_gate === 'ERROR' || acc.quality_gate === 'ERROR') {
          acc.quality_gate = 'ERROR';
        } else if (
          repo.quality_gate === 'WARN' ||
          acc.quality_gate === 'WARN'
        ) {
          acc.quality_gate = 'WARN';
        } else if (
          acc.quality_gate !== 'WARN' &&
          acc.quality_gate !== 'ERROR'
        ) {
          acc.quality_gate = repo.quality_gate || acc.quality_gate;
        }

        return acc;
      },
      {
        bugs: 0,
        code_smells: 0,
        vulnerabilities: 0,
        totalCoveragePoints: 0,
        coverageCount: 0,
        quality_gate: 'NONE',
      },
    );

    // Calculate average code coverage
    const code_coverage =
      totals.coverageCount > 0
        ? totals.totalCoveragePoints / totals.coverageCount
        : 0;

    // Create all issues array
    const allIssues: IssueDetail[] = [];

    // Add bug issues
    if (totals.bugs > 0) {
      allIssues.push({
        severity: totals.bugs > 5 ? 'high' : 'medium',
        description: `${totals.bugs} bugs detected across projects`,
      });
    }

    // Add code smell issues
    if (totals.code_smells > 0) {
      allIssues.push({
        severity: totals.code_smells > 50 ? 'medium' : 'low',
        description: `${totals.code_smells} code smells detected across projects`,
      });
    }

    // Add vulnerabilities issues
    if (totals.vulnerabilities > 0) {
      allIssues.push({
        severity: totals.vulnerabilities > 0 ? 'high' : 'medium',
        description: `${totals.vulnerabilities} vulnerabilities need review`,
      });
    }

    // Determine the overall status color for all repos
    let color: 'red' | 'yellow' | 'green' | 'gray' = 'green';
    if (
      totals.quality_gate === 'ERROR' ||
      totals.bugs > 0 ||
      totals.vulnerabilities > 0
    ) {
      color = 'red';
    } else if (totals.quality_gate === 'WARN' || totals.code_smells > 10) {
      color = 'yellow';
    }

    // Create the summary
    let summary = 'Code quality is excellent with no significant issues.';
    if (color === 'red') {
      summary = 'Critical code quality issues require immediate attention.';
    } else if (color === 'yellow') {
      summary = 'Code quality issues need to be addressed before release.';
    }

    return {
      metrics: {
        bugs: totals.bugs,
        code_smells: totals.code_smells,
        vulnerabilities: totals.vulnerabilities,
        code_coverage: parseFloat(code_coverage.toFixed(1)),
        quality_gate: totals.quality_gate,
      },
      color,
      summary,
      details: allIssues,
    };
  }, [repoData]);

  // Select current data based on selected repository
  const currentData = React.useMemo(() => {
    if (semaphoreType !== 'SonarQube') {
      return mockMetricsData[semaphoreType] || defaultData;
    }

    if (isLoading) {
      return { ...defaultData, summary: 'Loading SonarQube data...' };
    }

    if (selectedRepo === 'allRepos') {
      return aggregatedData || mockMetricsData.SonarQube || defaultData;
    }

    const selectedRepoData = repoData.find(repo => repo.name === selectedRepo);
    if (!selectedRepoData) {
      return aggregatedData || mockMetricsData.SonarQube || defaultData;
    }

    let summary = 'Code quality is excellent with no significant issues.';
    if (selectedRepoData.color === 'red') {
      summary = 'Critical code quality issues require immediate attention.';
    } else if (selectedRepoData.color === 'yellow') {
      summary = 'Code quality issues need to be addressed before release.';
    }

    return {
      metrics: {
        bugs: selectedRepoData.bugs,
        code_smells: selectedRepoData.code_smells,
        vulnerabilities: selectedRepoData.vulnerabilities,
        code_coverage: selectedRepoData.code_coverage,
        quality_gate: selectedRepoData.quality_gate,
      },
      color: selectedRepoData.color,
      summary,
      details: selectedRepoData.details,
    };
  }, [
    semaphoreType,
    selectedRepo,
    repoData,
    aggregatedData,
    isLoading,
    defaultData,
  ]);

  // Handle repository selection change
  const handleRepoChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedRepo(event.target.value as string);
  };

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

  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case 'critical':
        return 'error.main';
      case 'high':
        return 'error.light';
      case 'medium':
        return 'warning.main';
      case 'low':
        return 'info.main';
      default:
        return 'text.secondary';
    }
  };

  const getQualityGateDisplay = (status: string) => {
    switch (status) {
      case 'ERROR':
        return { text: 'Failed', color: '#d32f2f' };
      case 'WARN':
        return { text: 'Warning', color: '#ff9800' };
      case 'OK':
        return { text: 'Passed', color: '#4caf50' };
      default:
        return { text: 'Unknown', color: '#9e9e9e' };
    }
  };

  const renderSonarQubeMetrics = () => {
    const metrics = currentData.metrics;
    const qgDisplay = getQualityGateDisplay(metrics.quality_gate);

    return (
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <Paper className={classes.metricBox} elevation={1}>
            <Typography variant="h4" className={classes.metricValue}>
              {metrics.bugs}
            </Typography>
            <Typography className={classes.metricLabel}>Bugs</Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper className={classes.metricBox} elevation={1}>
            <Typography variant="h4" className={classes.metricValue}>
              {metrics.code_smells}
            </Typography>
            <Typography className={classes.metricLabel}>Code Smells</Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper className={classes.metricBox} elevation={1}>
            <Typography variant="h4" className={classes.metricValue}>
              {metrics.vulnerabilities}
            </Typography>
            <Typography className={classes.metricLabel}>
              Vulnerabilities
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper className={classes.metricBox} elevation={1}>
            <Typography variant="h4" className={classes.metricValue}>
              {metrics.code_coverage}%
            </Typography>
            <Typography className={classes.metricLabel}>
              Test Coverage
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper className={classes.metricBox} elevation={1}>
            <Typography
              variant="h4"
              className={classes.metricValue}
              style={{ color: qgDisplay.color }}
            >
              {qgDisplay.text}
            </Typography>
            <Typography className={classes.metricLabel}>
              Quality Gate
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    );
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
          <Box className={classes.statusCircle} bgcolor={currentData.color} />
          <Typography variant="h6">{semaphoreType} Status</Typography>
        </div>
      </DialogTitle>

      <DialogContent>
        {/* Repository selection dropdown (only for SonarQube) */}
        {semaphoreType === 'SonarQube' && (
          <div className={classes.filterContainer}>
            <Paper
              variant="outlined"
              className={classes.alertBox}
              style={{
                backgroundColor:
                  currentData.color === 'red'
                    ? '#ffebee'
                    : currentData.color === 'yellow'
                    ? '#fff8e1'
                    : '#e8f5e9',
                flex: 1,
                marginRight: '16px',
              }}
            >
              {getStatusIcon(currentData.color)}
              <Typography variant="body2">{currentData.summary}</Typography>
            </Paper>

            <FormControl variant="outlined" className={classes.repoSelect}>
              <InputLabel id="repository-select-label">Repository</InputLabel>
              <Select
                labelId="repository-select-label"
                id="repository-select"
                value={selectedRepo}
                onChange={handleRepoChange}
                label="Repository"
              >
                <MenuItem value="allRepos">All Repositories</MenuItem>
                {repoData.map(repo => (
                  <MenuItem key={repo.name} value={repo.name}>
                    {repo.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        )}

        {/* Metrics section */}
        {semaphoreType === 'SonarQube' ? renderSonarQubeMetrics() : null}

        {/* Details/Issues section */}
        {currentData.details && currentData.details.length > 0 && (
          <>
            <Box mt={3} mb={1}>
              <Typography variant="h6">Issues</Typography>
              <Divider />
            </Box>

            <List>
              {currentData.details.map((issue, index) => (
                <Paper key={index} className={classes.issueItem} elevation={0}>
                  <Typography
                    variant="subtitle1"
                    className={classes.issueTitle}
                  >
                    {issue.description}
                  </Typography>
                  <Box className={classes.chipContainer}>
                    <Chip
                      size="small"
                      label={issue.severity}
                      style={{
                        backgroundColor: getSeverityColor(issue.severity),
                        color: '#fff',
                      }}
                    />
                    {issue.repository && (
                      <Chip
                        size="small"
                        label={issue.repository}
                        variant="outlined"
                      />
                    )}
                    {issue.component && (
                      <Chip
                        size="small"
                        label={issue.component}
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Paper>
              ))}
            </List>
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
