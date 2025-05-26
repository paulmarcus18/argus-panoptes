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
import { getDependabotStatusFromFacts } from '../utils/factChecker';
import { CatalogApi } from '@backstage/plugin-catalog-react';
import { RepoAlertSummary } from '../utils/factChecker';


type Severity = 'critical' | 'high' | 'medium' | 'low';

interface IssueDetail {
  severity: Severity;
  description: string;
  component?: string;
}

interface SemaphoreData {
  color: 'red' | 'yellow' | 'green' | 'gray';
  metrics: Record<string, any>;
  summary: string;
  details: IssueDetail[];
}

interface DetailedSemaphoreDialogProps {
  open: boolean;
  onClose: () => void;
  semaphoreType: string;
  entities?: Entity[];
  systemName: string;
  catalogApi: CatalogApi;
  topCriticalRepos?: RepoAlertSummary[];
}

const useStyles = makeStyles(theme => ({
  dialogPaper: { minWidth: '500px' },
  statusIndicator: { display: 'flex', alignItems: 'center', marginBottom: theme.spacing(2) },
  statusCircle: { width: '24px', height: '24px', borderRadius: '50%', marginRight: theme.spacing(1) },
  metricBox: { padding: theme.spacing(2), marginBottom: theme.spacing(2), display: 'flex', flexDirection: 'column' },
  metricValue: { fontWeight: 'bold', fontSize: '22px' },
  metricLabel: { color: theme.palette.text.secondary },
  warningIcon: { color: theme.palette.warning.main, marginRight: theme.spacing(1) },
  errorIcon: { color: theme.palette.error.main, marginRight: theme.spacing(1) },
  successIcon: { color: theme.palette.success.main, marginRight: theme.spacing(1) },
  infoIcon: { color: theme.palette.info.main, marginRight: theme.spacing(1) },
  issueItem: { borderLeft: `4px solid ${theme.palette.error.main}`, padding: theme.spacing(1, 1, 1, 2), marginBottom: theme.spacing(1) },
  issueTitle: { fontWeight: 'bold' },
  chipContainer: { marginTop: theme.spacing(1), '& > *': { margin: theme.spacing(0.5) } },
  summarySection: { padding: theme.spacing(2), marginBottom: theme.spacing(2) },
}));

const DetailedSemaphoreDialog: React.FC<DetailedSemaphoreDialogProps> = ({
  open,
  onClose,
  semaphoreType,
  entities = [],
  systemName,
  catalogApi,
  topCriticalRepos = [], // ✅ Add this line
}) => {
  const classes = useStyles();
  const techInsightsApi = useApi(techInsightsApiRef);

  const defaultData: SemaphoreData = {
    color: 'gray',
    metrics: {},
    summary: 'No data available for this metric.',
    details: [],
  };

  const [liveData, setLiveData] = React.useState<SemaphoreData | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    const fetchDependabotData = async () => {
      setIsLoading(true);
      try {
        const result = await getDependabotStatusFromFacts(techInsightsApi, entities, systemName, catalogApi);
        const { color, reason, alertCounts } = result;
        const [totalCritical, totalHigh, totalMedium] = alertCounts;

        setLiveData({
          color,
          summary: reason,
          metrics: {
            critical: totalCritical,
            high: totalHigh,
            medium: totalMedium,
          },
          details: [],
        });

      } catch (e) {
        console.error('❌ Failed to fetch dependabot facts', e);
        setLiveData(null);
      } finally {
        setIsLoading(false);
      }
    };


    const fetchSonarQubeData = async () => {
      setIsLoading(true);
      try {
        const sonarQubeResults = await Promise.all(
          entities.map(entity =>
            getSonarQubeFacts(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            }),
          ),
        );

        const totals = sonarQubeResults.reduce(
          (acc, result) => {
            acc.bugs += result.bugs || 0;
            acc.code_smells += result.code_smells || 0;
            acc.security_hotspots += result.security_hotspots || 0;
            acc.coverage = result.coverage || '0%';
            acc.duplications = result.duplications || '0%';
            return acc;
          },
          { bugs: 0, code_smells: 0, security_hotspots: 0, coverage: '0%', duplications: '0%' },
        );

        const details: IssueDetail[] = [];
        if (totals.bugs > 0) details.push({ severity: totals.bugs > 5 ? 'high' : 'medium', description: `${totals.bugs} bugs detected` });
        if (totals.code_smells > 0) details.push({ severity: totals.code_smells > 50 ? 'medium' : 'low', description: `${totals.code_smells} code smells` });
        if (totals.security_hotspots > 0) details.push({ severity: 'high', description: `${totals.security_hotspots} security hotspots` });

        let color: 'red' | 'yellow' | 'green' | 'gray' = 'green';
        if (totals.bugs > 0 || totals.security_hotspots > 0) color = 'red';
        else if (totals.code_smells > 10) color = 'yellow';

        let summary = 'Code quality is excellent.';
        if (color === 'red') summary = 'Critical issues require attention.';
        else if (color === 'yellow') summary = 'Code quality issues exist.';

        setLiveData({ color, summary, metrics: totals, details });
      } catch (err) {
        console.error('Error fetching SonarQube data:', err);
        setLiveData(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (!semaphoreType || entities.length === 0) return;

    if (semaphoreType === 'SonarQube') fetchSonarQubeData();
    if (semaphoreType === 'Dependabot') fetchDependabotData();
  }, [semaphoreType, entities, techInsightsApi]);

  const data = React.useMemo(() => liveData ?? defaultData, [liveData]);

  const getStatusIcon = (color: string) => {
    switch (color) {
      case 'red': return <ErrorIcon className={classes.errorIcon} />;
      case 'yellow': return <WarningIcon className={classes.warningIcon} />;
      case 'green': return <CheckCircleIcon className={classes.successIcon} />;
      default: return <InfoIcon className={classes.infoIcon} />;
    }
  };

  const renderMetrics = () => {
    switch (semaphoreType) {
      case 'Dependabot':
        return (
          <Grid container spacing={2}>
            {['critical', 'high', 'medium'].map(sev => (
              <Grid item xs={4} key={sev}>
                <Paper className={classes.metricBox} elevation={1}>
                  <Typography variant="h4" className={classes.metricValue}>
                    {data.metrics[sev] ?? 0}
                  </Typography>
                  <Typography className={classes.metricLabel}>
                    {sev.charAt(0).toUpperCase() + sev.slice(1)}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        );
      // Keep existing SonarQube etc. as fallback
      default:
        return <Typography>No metrics available.</Typography>;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="semaphore-details-dialog"
      classes={{ paper: classes.dialogPaper }}
    >
      <DialogTitle id="semaphore-details-dialog">
        <div className={classes.statusIndicator}>
          <Box className={classes.statusCircle} bgcolor={data.color} />
          <Typography variant="h6">{semaphoreType} Status</Typography>
        </div>
      </DialogTitle>

      <DialogContent>
        <Paper className={classes.summarySection} elevation={0} variant="outlined">
          <Box display="flex" alignItems="center">
            {getStatusIcon(data.color)}
            <Typography variant="body1">{data.summary}</Typography>
          </Box>
        </Paper>

        {renderMetrics()}
        {semaphoreType === 'Dependabot' && topCriticalRepos?.length > 0 && (
          <Box mt={4}>
            <Typography variant="h6" gutterBottom>
              Top 5 Repos by Critical Alerts
            </Typography>
            <Grid container spacing={2}>
              {topCriticalRepos.map((repo, index) => (
                <Grid item xs={12} key={repo.name}>
                  <Paper variant="outlined" style={{ padding: '12px 16px' }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                          {index + 1}. {repo.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          High: {repo.high} | Medium: {repo.medium}
                        </Typography>
                      </Box>
                      <Box>
                        <Chip
                          label={`Critical: ${repo.critical}`}
                          color={repo.critical > 0 ? 'secondary' : 'default'}
                          style={{ fontWeight: 600 }}
                        />
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DetailedSemaphoreDialog;
