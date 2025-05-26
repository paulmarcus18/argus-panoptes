import { useState, useEffect, useRef } from 'react';
import {
  Typography,
  Grid,
  Box,
  Tooltip,
  IconButton,
  TextField,
  MenuItem,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  Popover,
  Button,
} from '@material-ui/core';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import SearchIcon from '@material-ui/icons/Search';
import FilterListIcon from '@material-ui/icons/FilterList';
import { Header, Page, Content, InfoCard } from '@backstage/core-components';
import { DialogComponent } from '../DialogComponent';
import DetailedSemaphoreDialog from '../DetailedSemaphoreDialog';
//import { ThresholdDialog } from '../TresholdDialogComponent';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { Entity } from '@backstage/catalog-model';
import { getSonarQubeFacts } from '../../utils/sonarCloudUtils';
import { getDependabotStatusFromFacts } from '../../utils/factChecker';
import { getPreproductionPipelineChecks } from '../../utils/preproductionUtils';

import { getGitHubSecurityFacts } from '../utils';
import { getFoundationPipelineChecks } from '../../utils/foundationUtils';

// TrafficLight component that renders a colored circle
const TrafficLight = ({
  color,
  onClick,
}: {
  color: 'red' | 'green' | 'yellow' | 'gray' | 'white';
  onClick?: () => void;
}) => (
  <Box
    my={1}
    width={50}
    height={50}
    borderRadius="50%"
    bgcolor={color}
    onClick={onClick}
    style={onClick ? { cursor: 'pointer' } : {}}
  />
);

// Dependabot traffic light component (existing implementation)
// interface DependabotProps {
//   owner: string;
//   repos: string[];
//   onClick?: () => void;
// }

// // Type for semaphore severity
// type Severity = 'critical' | 'high' | 'medium' | 'low';

// // Type for issue details - extended with URL and directLink
// interface IssueDetail {
//   severity: Severity;
//   description: string;
//   component?: string;
//   url?: string;
//   directLink?: string;
// }

const Trafficlightdependabot = ({
  entities,
  onClick,
}: {
  entities: Entity[];
  onClick?: () => void;
}) => {
  const [color, setColor] = useState<
    'green' | 'red' | 'yellow' | 'gray' | 'white'
  >('white');
  const [reason, setReason] = useState('Fetching Dependabot status...');
  const techInsightsApi = useApi(techInsightsApiRef);

  useEffect(() => {
    if (!entities.length) {
      setColor('gray');
      setReason('No entities available');
      return;
    }

    const fetchStatus = async () => {
      const result = await getDependabotStatusFromFacts(
        techInsightsApi,
        entities,
      );
      setColor(result.color);
      setReason(`Dependabot: ${result.color.toUpperCase()}`);
    };

    fetchStatus();
  }, [techInsightsApi, entities]);

  return (
    <Tooltip title={reason}>
      <Box
        my={1}
        width={50}
        height={50}
        borderRadius="50%"
        bgcolor={color}
        onClick={onClick}
        style={onClick ? { cursor: 'pointer' } : {}}
      />
    </Tooltip>
  );
};

// SonarQube traffic light component (new implementation)
interface SonarQubeTrafficLightProps {
  entities: Entity[];
  onClick?: () => void;
}

/**
 * SonarQubeTrafficLight is a React component that displays a colored traffic light indicator
 * representing the overall SonarQube quality status for a set of entities.
 *
 * The component fetches SonarQube quality gate status for each provided entity using the Tech Insights API,
 * aggregates the results, and determines the appropriate traffic light color:
 * - Green: The number of entities that failed the quality gate is below the yellow threshold (set in system file).
 * - Yellow: The number of entities that failed the quality gate is between the yellow threshold and the red threshold(set in system file).
 * - Red: The number of entities that failed the quality gate is above the red threshold (set in system file).
 * - Gray: No entities are selected, data cannot be retrieved or threshold cannot be retrieved.
 *
 * The component also displays a tooltip with a summary of the check results or error messages.
 *
 * @param entities - An array of Backstage Entity objects to check SonarQube status for.
 * @param onClick - Optional click handler for the traffic light indicator.
 * @returns A React element rendering the traffic light with a tooltip.
 */
const SonarQubeTrafficLight = ({
  entities,
  onClick,
}: SonarQubeTrafficLightProps) => {
  const [color, setColor] = useState<
    'green' | 'red' | 'yellow' | 'gray' | 'white'
  >('white');
  const [reason, setReason] = useState<string>('Loading SonarQube data...');
  const techInsightsApi = useApi(techInsightsApiRef);
  const catalogApi = useApi(catalogApiRef);

  useEffect(() => {
    const fetchSonarQubeData = async () => {
      // If there are no entities, set color to gray and display reason
      if (!entities.length) {
        setColor('gray');
        setReason('No entities selected');
        return;
      }

      // Get the system name from the first entity
      const systemName = entities[0].spec?.system;
      if (!systemName) {
        setColor('gray');
        setReason('System metadata is missing');
        return;
      }

      // Fetch system entity metadata from catalog
        const systemEntity = await catalogApi.getEntityByRef({
          kind: 'system',
          namespace: 'default',
          name: typeof systemName === 'string' ? systemName : String(systemName)
        });

      // Get thresholds for traffic light colour from system annotations
      const redThreshold = parseFloat(
        systemEntity?.metadata.annotations?.['tech-insights.io/sonarcloud-quality-gate-red-threshold-percentage'] || '50'
      );
      const yellowThreshold = parseFloat(
        systemEntity?.metadata.annotations?.['tech-insights.io/sonarcloud-quality-gate-yellow-threshold-percentage'] || '25'
      );

      try {
        // Get the results of the SonarQube fact retriever for all entities
        const sonarQubeCheckResults = await Promise.all(
          entities.map(entity =>
            getSonarQubeFacts(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            }),
          ),
        );

        // Count how many entities failed the quality gate check
        const totalFailedQualityGate = sonarQubeCheckResults.reduce(
          (acc, result) => {
            acc += result.quality_gate !== 'OK' ? 1 : 0;
            return acc;
          },
          0,
        );

        // If the number of entities that failed the quality gate check is above the red threshold
        // Set the colour to red
        if (totalFailedQualityGate >= redThreshold * entities.length / 100) {
          setColor('red');
          setReason(
            `${totalFailedQualityGate} entities failed the quality gate check`,
          );
        } else if (totalFailedQualityGate >= yellowThreshold * entities.length / 100) {	
          // If the number of entities that failed the quality gate check is between the red and the yellow threshold
          // Set the colour to yellow
          setColor('yellow');
          setReason(
            `${totalFailedQualityGate} entities failed the quality gate check`,
          );
        }	 else {
          // If the number of entities that failed the quality gate check is below the yellow threshold
          // Set the colour to green 
          setColor('green');
          setReason(
            `${totalFailedQualityGate} entities failed the quality gate check`,
          );
        }
      } catch (err) {
        // Handle errors
        console.error('Error fetching SonarQube data:', err);
        setColor('gray');
        setReason('Failed to retrieve SonarQube data');
      }
    };
    fetchSonarQubeData();
  }, [entities, techInsightsApi]);

  return (
    <Tooltip title={reason}>
      <div>
        <Box
          my={1}
          width={50}
          height={50}
          borderRadius="50%"
          bgcolor={color}
          onClick={onClick}
          style={onClick ? { cursor: 'pointer' } : {}}
        />
      </div>
    </Tooltip>
  );
};

// Preproduction pipeline traffic light component (new implementation)
interface PreproductionTrafficLightProps {
  entities: Entity[];
  onClick?: () => void;
}

/**
 * PreproductionTrafficLight is a React component that displays a colored traffic light indicator
 * representing the overall Preproduction pipeline quality status for a set of entities.
 *
 * The component fetches Preproduction pipeline fact check results for each provided entity using the Tech Insights API,
 * aggregates the results, and determines the appropriate traffic light color:
 * - Green: success metric is true and failure is true for all entities.
 * - Yellow: success metric is true and failure is false for all entities.
 * - Red: success metric and failure is false for all entities.
 * - Gray: No entities are selected or data cannot be retrieved.
 *
 * The component also displays a tooltip with a summary of the check results or error messages.
 *
 * @param entities - An array of Backstage Entity objects to check Preproduction pipeline status for.
 * @param onClick - Optional click handler for the traffic light indicator.
 * @returns A React element rendering the traffic light with a tooltip.
 */
const PreproductionTrafficLight = ({
  entities,
  onClick,
}: PreproductionTrafficLightProps) => {
  const [color, setColor] = useState<
    'green' | 'red' | 'yellow' | 'gray' | 'white'
  >('white');
  const [reason, setReason] = useState<string>(
    'Loading Preproduction pipeline data...',
  );
  const techInsightsApi = useApi(techInsightsApiRef);

  useEffect(() => {
    const fetchPreproductionData = async () => {
      // If there are no entities, set color to gray and display reason
      if (!entities.length) {
        setColor('gray');
        setReason('No entities selected');
        return;
      }

      try {
        // Get the results of the SonarQube fact checks for all entities
        const preproductionCheckResults = await Promise.all(
          entities.map(entity =>
            getPreproductionPipelineChecks(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            }),
          ),
        );

        // Count total number of failed checks for each metric
        const totalChecks = preproductionCheckResults.reduce(
          (acc, result) => {
            acc.successRateCheckFalse +=
              result.successRateCheck === false ? 1 : 0;
            return acc;
          },
          {
            successRateCheckFalse: 0,
          },
        );

        // Determine traffic light color based on metrics
        if (
          // All checks passed for all entities
          totalChecks.successRateCheckFalse === 0
        ) {
          setColor('green');
          setReason(
            `All Preproduction pipeline checks passed for all entities`,
          );
        } else if (totalChecks.successRateCheckFalse > entities.length / 3) {
          // at least 1 of the checks are 'red' (failed for more than 1/3 of entities) (!!! for now change this later)
          setColor('red');
          setReason(
            `${totalChecks.successRateCheckFalse} entities failed the success rate check,`,
          );
        } else {
          setColor('yellow');
          setReason(
            `${totalChecks.successRateCheckFalse} entities failed the success rate check, `,
          );
        }
      } catch (err) {
        // Handle errors
        console.error('Error fetching SonarQube data:', err);
        setColor('gray');
        setReason('Failed to retrieve SonarQube data');
      }
    };
    fetchPreproductionData();
  }, [entities, techInsightsApi]);

  return (
    <Tooltip title={reason}>
      <div>
        <Box
          my={1}
          width={50}
          height={50}
          borderRadius="50%"
          bgcolor={color}
          onClick={onClick}
          style={onClick ? { cursor: 'pointer' } : {}}
        />
      </div>
    </Tooltip>
  );
};

interface FoundationTrafficLightProps {
  entities: Entity[];
  onClick?: () => void;
}

/**
 * FoundationTrafficLight is a React component that displays a colored traffic light indicator
 * representing the overall Foundation pipeline quality status for a set of entities.
 *
 * @param entities - An array of Backstage Entity objects to check Foundation pipeline status for.
 * @param onClick - Optional click handler for the traffic light indicator.
 * @returns A React element rendering the traffic light with a tooltip.
 */
const FoundationTrafficLight = ({
  entities,
  onClick,
}: FoundationTrafficLightProps) => {
  const [color, setColor] = useState<
    'green' | 'red' | 'yellow' | 'gray' | 'white'
  >('white');
  const [reason, setReason] = useState<string>(
    'Loading Foundation pipeline data...',
  );
  const techInsightsApi = useApi(techInsightsApiRef);

  useEffect(() => {
    const fetchFoundationData = async () => {
      if (!entities.length) {
        setColor('gray');
        setReason('No entities selected');
        return;
      }

      try {
        const foundationCheckResults = await Promise.all(
          entities.map(entity =>
            getFoundationPipelineChecks(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            }),
          ),
        );

        const totalChecks = foundationCheckResults.reduce(
          (acc, result) => {
            acc.successRateCheckFalse +=
              result.successRateCheck === false ? 1 : 0;
            return acc;
          },
          {
            successRateCheckFalse: 0,
          },
        );

        if (totalChecks.successRateCheckFalse === 0) {
          setColor('green');
          setReason(`All Foundation pipeline checks passed for all entities`);
        } else if (totalChecks.successRateCheckFalse > entities.length / 3) {
          setColor('red');
          setReason(
            `${totalChecks.successRateCheckFalse} entities failed the success rate check`,
          );
        } else {
          setColor('yellow');
          setReason(
            `${totalChecks.successRateCheckFalse} entities failed the success rate check`,
          );
        }
      } catch (err) {
        console.error('Error fetching Foundation pipeline data:', err);
        setColor('gray');
        setReason('Failed to retrieve Foundation pipeline data');
      }
    };

    fetchFoundationData();
  }, [entities, techInsightsApi]);

  return (
    <Tooltip title={reason}>
      <div>
        <Box
          my={1}
          width={50}
          height={50}
          borderRadius="50%"
          bgcolor={color}
          onClick={onClick}
          style={onClick ? { cursor: 'pointer' } : {}}
        />
      </div>
    </Tooltip>
  );
};

// Github advanced security traffic light component (new implementation)
interface GitHubSecurityTrafficLightProps {
  entities: Entity[];
  onClick?: () => void;
}
// Github Advanced security traffic light component
const GitHubSecurityTrafficLight = ({
  entities,
  onClick,
}: GitHubSecurityTrafficLightProps) => {
  const [color, setColor] = useState<
    'green' | 'red' | 'yellow' | 'gray' | 'white'
  >('white');
  const [reason, setReason] = useState<string>(
    'Loading GitHub Security data...',
  );
  const techInsightsApi = useApi(techInsightsApiRef);

  useEffect(() => {
    const fetchGitHubSecurityData = async () => {
      if (!entities.length) {
        setColor('gray');
        setReason('No entities selected');
        return;
      }

      try {
        // Get GitHub security facts for all entities
        const securityResults = await Promise.all(
          entities.map(entity =>
            getGitHubSecurityFacts(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            }),
          ),
        );

        // Process the results to categorize findings by severity
        let criticalIssues = 0;
        let highIssues = 0;
        let mediumIssues = 0;
        let lowIssues = 0;

        securityResults.forEach(result => {
          // Process code scanning alerts
          Object.values(result.codeScanningAlerts || {}).forEach(alert => {
            // Count by severity
            switch (alert.severity) {
              case 'critical':
                criticalIssues++;
                break;
              case 'high':
                highIssues++;
                break;
              case 'medium':
                mediumIssues++;
                break;
              case 'low':
                lowIssues++;
                break;
              default:
                // Default to medium if severity is unknown
                mediumIssues++;
            }
          });

          // Process secret scanning alerts (most secret scanning alerts are high severity)
          Object.values(result.secretScanningAlerts || {}).forEach(() => {
            highIssues++; // Most secret alerts are high severity
          });
        });

        // Count totals
        const totalCodeScanningAlerts = securityResults.reduce(
          (sum, result) => sum + result.openCodeScanningAlertCount,
          0,
        );

        const totalSecretScanningAlerts = securityResults.reduce(
          (sum, result) => sum + result.openSecretScanningAlertCount,
          0,
        );

        const totalIssues = totalCodeScanningAlerts + totalSecretScanningAlerts;

        // Determine traffic light color based on security metrics
        if (criticalIssues > 0 || highIssues > 0) {
          setColor('red');
          setReason(
            `Critical security issues found: ${criticalIssues} critical, ${highIssues} high severity issues`,
          );
        } else if (mediumIssues > 0) {
          setColor('yellow');
          setReason(`${mediumIssues} medium severity issues found`);
        } else if (lowIssues > 0) {
          setColor('yellow');
          setReason(`${lowIssues} low severity issues found`);
        } else if (totalIssues === 0) {
          setColor('green');
          setReason('No security issues detected');
        } else {
          setColor('yellow');
          setReason(`${totalIssues} security issues found`);
        }
      } catch (err) {
        console.error('Error fetching GitHub Security data:', err);
        setColor('gray');
        setReason('Failed to retrieve GitHub Security data');
      }
    };

    fetchGitHubSecurityData();
  }, [entities, techInsightsApi]);

  return (
    <Tooltip title={reason}>
      <div>
        <Box
          my={1}
          width={50}
          height={50}
          borderRadius="50%"
          bgcolor={color}
          onClick={onClick}
          style={onClick ? { cursor: 'pointer' } : {}}
        />
      </div>
    </Tooltip>
  );
};

// Main component
export const TrafficComponent = () => {
  const catalogApi = useApi(catalogApiRef);
  //const techInsightsApi = useApi(techInsightsApiRef);
  const systemMenuButtonRef = useRef<HTMLButtonElement>(null);

  // Repository data states
  const [repos, setRepos] = useState<
    {
      name: string;
      description: string;
      owner?: string;
      system?: string;
      tags?: string[];
      entity: Entity;
    }[]
  >([]);

  // Status data state (for mock statuses)
  const [statusData] = useState<Record<
    string,
    { color: 'red' | 'green' | 'yellow' | 'gray' | 'white'; reason: string }
  > | null>(null);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogItems, setDialogItems] = useState<
    { name: string; color: string }[]
  >([]);

  // New detailed dialog states
  const [detailedDialogOpen, setDetailedDialogOpen] = useState(false);
  const [currentSemaphoreType, setCurrentSemaphoreType] = useState('');

  // Filter states
  const [onlyMyRepos, setOnlyMyRepos] = useState(true);
  const [onlyCritical, setOnlyCritical] = useState(true);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<Entity[]>([]);
  const [availableSystems, setAvailableSystems] = useState<string[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<string>('all');
  const [systemSearchTerm, setSystemSearchTerm] = useState<string>('');
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);

  // Dialog handlers
  const handleClick = (
    title: string,
    items: { name: string; color: string }[],
  ) => {
    setDialogTitle(title);
    setDialogItems(items);
    setDialogOpen(true);
  };

  //closes the dialog
  const handleClose = () => {
    setDialogOpen(false);
  };

  // New detailed dialog handlers
  const handleSemaphoreClick = (semaphoreType: string) => {
    setCurrentSemaphoreType(semaphoreType);
    setDetailedDialogOpen(true);
  };

  const handleCloseDetailedDialog = () => {
    setDetailedDialogOpen(false);
  };

  const cardAction = (
    title: string,
    items: { name: string; color: string }[],
  ) => (
    <IconButton onClick={() => handleClick(title, items)}>
      <MoreVertIcon />
    </IconButton>
  );

  // Fetch catalog data on component mount
  useEffect(() => {
    const fetchCatalogRepos = async () => {
      try {
        const entities = await catalogApi.getEntities({
          filter: { kind: 'Component' },
        });

        const simplified = entities.items.map((entity: Entity) => ({
          name: entity.metadata.name,
          description: entity.metadata.description ?? 'No description',
          owner:
            typeof entity.spec?.owner === 'string'
              ? entity.spec.owner.toLowerCase()
              : undefined,
          system:
            typeof entity.spec?.system === 'string'
              ? entity.spec.system
              : undefined,
          tags: entity.metadata?.tags,
          entity: entity, // Store the full entity for later use
        }));

        setRepos(simplified);

        // Extract unique systems for filter dropdown
        const systems = Array.from(
          new Set(
            simplified
              .map(repo => repo.system)
              .filter(system => system !== undefined) as string[],
          ),
        ).sort();

        setAvailableSystems(systems);

        // Select all repos by default
        setSelectedRepos(simplified.map(r => r.name));
        setSelectedEntities(simplified.map(r => r.entity));
      } catch (err) {
        console.error('Failed to load catalog entities', err);
      }
    };

    fetchCatalogRepos();
  }, [catalogApi]);

  // Apply filters when filter settings change
  useEffect(() => {
    const filtered = repos.filter(repo => {
      const isMine = !onlyMyRepos || repo.owner === 'philips-labs';
      const isCritical = !onlyCritical || repo.tags?.includes('critical');
      const isInSelectedSystem =
        selectedSystem === 'all' || repo.system === selectedSystem;
      return isMine && isCritical && isInSelectedSystem;
    });

    setSelectedRepos(filtered.map(r => r.name));
    setSelectedEntities(filtered.map(r => r.entity));
  }, [onlyMyRepos, onlyCritical, repos, selectedSystem]);

  // Filter systems based on search term
  const filteredSystems = availableSystems.filter(system =>
    system.toLowerCase().includes(systemSearchTerm.toLowerCase()),
  );

  // System menu handlers
  const handleSystemSelect = (system: string) => {
    setSelectedSystem(system);
    setSystemMenuOpen(false);
  };

  const handleOpenSystemMenu = () => {
    setSystemMenuOpen(true);
  };

  const handleCloseSystemMenu = () => {
    setSystemMenuOpen(false);
  };

  return (
    <Page themeId="tool">
      <Header title="Traffic light plugin" subtitle="" />
      <Content>
        {/* Filters */}
        <Box display="flex" mb={3} alignItems="center" flexWrap="wrap">
          <FormControlLabel
            control={
              <Checkbox
                checked={onlyMyRepos}
                onChange={() => setOnlyMyRepos(prev => !prev)}
                color="primary"
              />
            }
            label="My repositories"
            style={{ marginRight: '2rem' }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={onlyCritical}
                onChange={() => setOnlyCritical(prev => !prev)}
                color="primary"
              />
            }
            label="Critical"
            style={{ marginRight: '2rem' }}
          />

          <Box style={{ minWidth: 200 }}>
            <Button
              ref={systemMenuButtonRef}
              variant="outlined"
              onClick={handleOpenSystemMenu}
              startIcon={<FilterListIcon />}
              fullWidth
            >
              {selectedSystem === 'all' ? 'All Systems' : selectedSystem}
            </Button>
            <Popover
              open={systemMenuOpen}
              anchorEl={systemMenuButtonRef.current}
              onClose={handleCloseSystemMenu}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              PaperProps={{
                style: { width: '300px', maxHeight: '400px' },
              }}
            >
              <Box p={2}>
                <TextField
                  placeholder="Search systems..."
                  fullWidth
                  value={systemSearchTerm}
                  onChange={e => setSystemSearchTerm(e.target.value)}
                  variant="outlined"
                  size="small"
                  autoFocus
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Box overflow="auto" maxHeight="300px">
                <MenuItem
                  onClick={() => handleSystemSelect('all')}
                  selected={selectedSystem === 'all'}
                >
                  <em>All Systems</em>
                </MenuItem>
                {filteredSystems.map(system => (
                  <MenuItem
                    key={system}
                    onClick={() => handleSystemSelect(system)}
                    selected={selectedSystem === system}
                  >
                    {system}
                  </MenuItem>
                ))}
                {filteredSystems.length === 0 && (
                  <Box p={2}>
                    <Typography variant="body2" color="textSecondary">
                      No systems found
                    </Typography>
                  </Box>
                )}
              </Box>
            </Popover>
          </Box>
        </Box>

        {/* Selected Repositories Display */}
        {selectedRepos.length > 0 && (
          <Box mb={4}>
            <InfoCard title={`Selected Repositories (${selectedRepos.length})`}>
              <Box maxHeight={200} overflow="auto" p={1}>
                <Grid container spacing={1}>
                  {selectedRepos.map(repo => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={repo}>
                      <Typography variant="body2" component="div">
                        <Box
                          bgcolor="rgba(0, 0, 0, 0.04)"
                          p={1}
                          borderRadius={1}
                          overflow="hidden"
                          textOverflow="ellipsis"
                          whiteSpace="nowrap"
                          title={repo}
                        >
                          {repo}
                        </Box>
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </InfoCard>
          </Box>
        )}

        {/* Traffic Light Cards */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <InfoCard
              title="Security Checks"
              action={cardAction('Security Checks', [
                { name: 'Dependabot', color: 'green' },
                {
                  name: 'BlackDuck',
                  color:
                    (statusData?.BlackDuck?.color as
                      | 'red'
                      | 'green'
                      | 'yellow'
                      | 'gray'
                      | 'white') || 'yellow',
                },
                { name: 'Github Advanced Security', color: 'yellow' },
              ])}
            >
              <Typography variant="subtitle1">Dependabot</Typography>
              <Tooltip title="Live check from Tech Insights">
                <div>
                  <Trafficlightdependabot
                    entities={selectedEntities}
                    onClick={() => handleSemaphoreClick('Dependabot')}
                  />
                </div>
              </Tooltip>

              <Typography variant="subtitle1">BlackDuck</Typography>
              <Tooltip title={statusData?.BlackDuck?.reason || ''}>
                <div>
                  <TrafficLight
                    color={
                      (statusData?.BlackDuck?.color as
                        | 'red'
                        | 'green'
                        | 'yellow'
                        | 'gray'
                        | 'white') || 'yellow'
                    }
                    onClick={() => handleSemaphoreClick('BlackDuck')}
                  />
                </div>
              </Tooltip>

              <Typography variant="subtitle1">
                Github Advanced Security
              </Typography>
              <GitHubSecurityTrafficLight
                entities={selectedEntities}
                onClick={() => handleSemaphoreClick('Github Advanced Security')}
              />
            </InfoCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <InfoCard
              title="Software Quality"
              action={cardAction('Software Quality', [
                { name: 'SonarQube', color: 'yellow' },
                {
                  name: 'CodeScene',
                  color:
                    (statusData?.CodeScene?.color as
                      | 'red'
                      | 'green'
                      | 'yellow'
                      | 'gray'
                      | 'white') || 'yellow',
                },
              ])}
            >
              <Typography variant="subtitle1">SonarQube</Typography>
              {/* SonarQube component that uses real data */}
              <SonarQubeTrafficLight
                entities={selectedEntities}
                onClick={() => handleSemaphoreClick('SonarQube')}
              />

              <Typography variant="subtitle1">CodeScene</Typography>
              <Tooltip title={statusData?.CodeScene?.reason || ''}>
                <div>
                  <TrafficLight
                    color={
                      (statusData?.CodeScene?.color as
                        | 'red'
                        | 'green'
                        | 'yellow'
                        | 'gray'
                        | 'white') || 'yellow'
                    }
                    onClick={() => handleSemaphoreClick('CodeScene')}
                  />
                </div>
              </Tooltip>
            </InfoCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <InfoCard
              title="Reporting Pipelines"
              action={cardAction('Reporting Pipelines', [
                {
                  name: 'Reporting Pipeline',
                  color: statusData?.['Reporting Pipeline']?.color || 'yellow',
                },
              ])}
            >
              <Typography variant="subtitle1">Reporting Pipeline</Typography>
              <Tooltip title={statusData?.['Reporting Pipeline']?.reason || ''}>
                <div>
                  <TrafficLight
                    color={
                      (statusData?.['Reporting Pipeline']?.color as
                        | 'red'
                        | 'green'
                        | 'yellow'
                        | 'gray'
                        | 'white') || 'yellow'
                    }
                    onClick={() => handleSemaphoreClick('Reporting Pipeline')}
                  />
                </div>
              </Tooltip>
            </InfoCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <InfoCard
              title="Pre-Production Environment Status"
              action={cardAction('Pre-Production Environment', [
                {
                  name: 'Pre-Production pipelines',
                  color:
                    statusData?.['Pre-Production pipelines']?.color || 'yellow',
                },
              ])}
            >
              {/* <Typography variant="subtitle1">
                Pre-Production pipelines
              </Typography>
              <Tooltip
                title={statusData?.['Pre-Production pipelines']?.reason || ''}
              >
                <div>
                  <TrafficLight
                    color={
                      (statusData?.['Pre-Production pipelines']?.color as
                        | 'red'
                        | 'green'
                        | 'yellow'
                        | 'gray'
                        | 'white') || 'yellow'
                    }
                    onClick={() =>
                      handleSemaphoreClick('Pre-Production pipelines')
                    }
                  />
                </div>
              </Tooltip> */}
              <Typography variant="subtitle1">
                Pre-production pipelines
              </Typography>
              {/* SonarQube component that uses real data */}
              <PreproductionTrafficLight
                entities={selectedEntities}
                onClick={() => handleSemaphoreClick('Pre-Production pipelines')}
              />
            </InfoCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <InfoCard
              title="Foundation Pipelines"
              action={cardAction('Foundation Pipelines', [
                {
                  name: 'Foundation Pipelines',
                  color:
                    statusData?.['Foundation Pipelines']?.color || 'yellow',
                },
              ])}
            >
              <Typography variant="subtitle1">Foundation pipelines</Typography>
              {/* SonarQube component that uses real data */}
              <FoundationTrafficLight
                entities={selectedEntities}
                onClick={() => handleSemaphoreClick('Foundation pipelines')}
              />
            </InfoCard>
          </Grid>
        </Grid>

        {/* Regular Dialog Component */}
        <DialogComponent
          open={dialogOpen}
          onClose={handleClose}
          title={dialogTitle}
          items={dialogItems}
        />

        {/* Detailed Semaphore Dialog Component */}
        <DetailedSemaphoreDialog
          open={detailedDialogOpen}
          onClose={handleCloseDetailedDialog}
          semaphoreType={currentSemaphoreType}
          entities={selectedEntities}
        />
      </Content>
    </Page>
  );
};
