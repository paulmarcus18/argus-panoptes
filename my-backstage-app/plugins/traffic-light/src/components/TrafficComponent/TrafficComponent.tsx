//imports for state, effect hooks and ref
import React, { useState, useEffect, useRef } from 'react';
//material and UI components for layout, form controls and icons
import {
  Typography,
  Grid,
  Box,
  Tooltip,
  IconButton,
  FormControl,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  Popover,
  Button,
} from '@material-ui/core';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import SearchIcon from '@material-ui/icons/Search';
import FilterListIcon from '@material-ui/icons/FilterList';
//backstage components for page layout and UI
import { Header, Page, Content, InfoCard } from '@backstage/core-components';
//local api import to fetch mock status data
import { fetchRepoStatus, StatusResponse } from '../api/mockStatusApi';
//import dialog component, this allows treshold configuration
import { DialogComponent } from '../DialogComponent';
//backstage api's to access catalog information
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Entity } from '@backstage/catalog-model';

//renders a trafficlight based on the color parameter passed
const TrafficLight = ({ color }: { color: 'red' | 'green' | 'yellow' }) => (
  <Box my={1} width={50} height={50} borderRadius="50%" bgcolor={color} />
);

//props interface defining expected inputs to the component
interface Props {
  owner: string; //GitHub username or organization
  repos: string[]; //List of repository names to check
}

//main functional component to determine and show dependabot status
const Trafficlightdependabot = ({ owner, repos }: Props) => {
  //local state to track the traffic light color
  const [color, setColor] = useState<
    'green' | 'red' | 'yellow' | 'gray' | 'white'
  >('white');

  //this runs when component mounts or when `owner` or `repos` change
  useEffect(() => {
    //Async function to fetch status for each repo
    const fetchStatuses = async () => {
      try {
        //fetch statuses concurrently for all repositories
        const statuses = await Promise.all(
          repos.map(async repo => {
            const res = await fetch(
              `/api/traffic-light/dependabotStatus/${owner}/${repo}`,
            );
            if (!res.ok) throw new Error(); //non successful response
            const data = await res.json(); //parse json response
            return data.status; //extract status string
          }),
        );

        //determine traffic light color based on repo statuses
        if (statuses.includes('red')) {
          setColor('red');
        } else if (statuses.includes('yellow') || statuses.includes('gray')) {
          setColor('yellow');
        } else if (statuses.every(status => status === 'green')) {
          setColor('green');
        } else {
          setColor('white');
        }
      } catch (err) {
        console.error('Error fetching statuses:', err);
        setColor('gray');
      }
    };

    //trigger fetch function
    fetchStatuses();
  }, [owner, repos]); //dependencies that trigger the effect

  //render the traffic light color indicator
  return (
    <Box my={1} width={50} height={50} borderRadius="50%" bgcolor={color} />
  );
};

//defines a component named TrafficComponent
export const TrafficComponent = () => {
  //accesses the catalog API from backstage to retrieve entities
  const catalogApi = useApi(catalogApiRef);
  //creates a ref for the system filter button to anchor a Popover
  const systemMenuButtonRef = useRef<HTMLButtonElement>(null);
  //state for storing repository metadata from the catalog
  const [repos, setRepos] = useState<
    {
      name: string;
      description: string;
      owner?: string;
      system?: string;
      tags?: string[];
    }[]
  >([]);
  //state to hold traffic light status data for various checks
  const [statusData, setStatusData] = useState<StatusResponse | null>(null);
  //states for managing the dialog window showing check details
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogItems, setDialogItems] = useState<
    { name: string; color: string }[]
  >([]);
  //states to filter only owned and critical repos
  const [onlyMyRepos, setOnlyMyRepos] = useState(true);
  const [onlyCritical, setOnlyCritical] = useState(true);
  //stores the names of repos selected for status display
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  //state variables for system filtering UI, search and selection
  const [availableSystems, setAvailableSystems] = useState<string[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<string>('all');
  const [systemSearchTerm, setSystemSearchTerm] = useState<string>('');
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);

  //opens a dialog with the provided title and items
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

  //returns an icon button that triggers the dialog for InfoCard actions
  const cardAction = (
    title: string,
    items: { name: string; color: string }[],
  ) => (
    <IconButton onClick={() => handleClick(title, items)}>
      <MoreVertIcon />
    </IconButton>
  );

  //side effect hook to fetch catalog entities on mount
  useEffect(() => {
    const fetchCatalogRepos = async () => {
      //fetches all entities of component kind
      try {
        const entities = await catalogApi.getEntities({
          filter: { kind: 'Component' },
        });
        //maps entity data to simplified structure
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

        //stores available systems and sets all repos as selected by default
        setAvailableSystems(systems);
        setSelectedRepos(simplified.map(r => r.name)); // select all by default
      } catch (err) {
        console.error('Failed to load catalog entities', err);
      }
    };

    //effect dependency is the API instance and runs once on mount
    fetchCatalogRepos();
  }, [catalogApi]);

  //filters repos based on owner being `philips-labs`, repos being critical and system matching
  //TO-DO!! : make owner filter equal to owner variable and not hardcoded string
  useEffect(() => {
    //filters repos based on owner being `philips-labs`, repos being critical and system matching
    const filtered = repos.filter(repo => {
      //updates selected repos when filters change
      const isMine = !onlyMyRepos || repo.owner === 'philips-labs';
      const isCritical = !onlyCritical || repo.tags?.includes('critical');
      const isInSelectedSystem =
        selectedSystem === 'all' || repo.system === selectedSystem;
      return isMine && isCritical && isInSelectedSystem;
    });

    setSelectedRepos(filtered.map(r => r.name));
  }, [onlyMyRepos, onlyCritical, repos, selectedSystem]);

  // Filter systems based on search term
  const filteredSystems = availableSystems.filter(system =>
    system.toLowerCase().includes(systemSearchTerm.toLowerCase()),
  );

  //updates selected system and closes the dropdown
  const handleSystemSelect = (system: string) => {
    setSelectedSystem(system);
    setSystemMenuOpen(false);
  };

  //handlers to open and close the system popover
  const handleOpenSystemMenu = () => {
    setSystemMenuOpen(true);
  };

  const handleCloseSystemMenu = () => {
    setSystemMenuOpen(false);
  };

  //starts the component render
  return (
    <Page themeId="tool">
      <Header title="Traffic light plugin" subtitle="" />
      <Content>
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

        {/* Selected Repositories Section - Separate from filters */}
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

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <InfoCard
              title="Security Checks"
              action={cardAction('Security Checks', [
                { name: 'Dependabot', color: 'green' },
                {
                  name: 'BlackDuck',
                  color: statusData?.BlackDuck?.color || 'yellow',
                },
                {
                  name: 'Fortify',
                  color: statusData?.Fortify?.color || 'yellow',
                },
              ])}
            >
              <Typography variant="subtitle1">Dependabot</Typography>
              <Tooltip title="Live check from Tech Insights">
                <div>
                  <Trafficlightdependabot
                    owner="MeherShroff2"
                    repos={selectedRepos}
                    //repos = {"dct-notary-admin" }
                  />
                </div>
              </Tooltip>

              <Typography variant="subtitle1">BlackDuck</Typography>
              <Tooltip title={statusData?.BlackDuck?.reason || ''}>
                <div>
                  <TrafficLight
                    color={statusData?.BlackDuck?.color || 'yellow'}
                  />
                </div>
              </Tooltip>

              <Typography variant="subtitle1">Fortify</Typography>
              <Tooltip title={statusData?.Fortify?.reason || ''}>
                <div>
                  <TrafficLight
                    color={statusData?.Fortify?.color || 'yellow'}
                  />
                </div>
              </Tooltip>
            </InfoCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <InfoCard
              title="Software Quality"
              action={cardAction('Software Quality', [
                {
                  name: 'SonarQube',
                  color: statusData?.SonarQube?.color || 'yellow',
                },
                {
                  name: 'CodeScene',
                  color: statusData?.CodeScene?.color || 'yellow',
                },
              ])}
            >
              <Typography variant="subtitle1">SonarQube</Typography>
              <Tooltip title={statusData?.SonarQube?.reason || ''}>
                <div>
                  <TrafficLight
                    color={statusData?.SonarQube?.color || 'yellow'}
                  />
                </div>
              </Tooltip>

              <Typography variant="subtitle1">CodeScene</Typography>
              <Tooltip title={statusData?.CodeScene?.reason || ''}>
                <div>
                  <TrafficLight
                    color={statusData?.CodeScene?.color || 'yellow'}
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
                      statusData?.['Reporting Pipeline']?.color || 'yellow'
                    }
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
              <Typography variant="subtitle1">
                Pre-Production pipelines
              </Typography>
              <Tooltip
                title={statusData?.['Pre-Production pipelines']?.reason || ''}
              >
                <div>
                  <TrafficLight
                    color={
                      statusData?.['Pre-Production pipelines']?.color ||
                      'yellow'
                    }
                  />
                </div>
              </Tooltip>
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
              <Typography variant="subtitle1">Foundation Pipelines</Typography>
              <Tooltip
                title={statusData?.['Foundation Pipelines']?.reason || ''}
              >
                <div>
                  <TrafficLight
                    color={
                      statusData?.['Foundation Pipelines']?.color || 'yellow'
                    }
                  />
                </div>
              </Tooltip>
            </InfoCard>
          </Grid>
        </Grid>

        <DialogComponent
          open={dialogOpen}
          onClose={handleClose}
          title={dialogTitle}
          items={dialogItems}
        />
      </Content>
    </Page>
  );
};
