import React, { useState, useEffect, useRef } from 'react';
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
import { DialogComponent } from '../Dialogs/DialogComponent';
import DetailedSemaphoreDialog from '../Dialogs/DetailedSemaphoreDialog/DetailedSemaphoreDialog';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import {
  TrafficLightDependabot,
  GitHubSecurityTrafficLight,
  SonarQubeTrafficLight,
  PreproductionTrafficLight,
  FoundationTrafficLight,
  AzureDevOpsBugsTrafficLight,
  BaseTrafficLight,
} from '../Semaphores';

// Dependabot traffic light component (existing implementation)
// interface DependabotProps {
//   owner: string;
//   repos: string[];
//   onClick?: () => void;
// }

// Main component
export const TrafficComponent = () => {
  const catalogApi = useApi(catalogApiRef);
  const systemMenuButtonRef = useRef<HTMLButtonElement>(null);

  const [repos, setRepos] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogItems, setDialogItems] = useState<any[]>([]);
  const [detailedDialogOpen, setDetailedDialogOpen] = useState(false);
  const [currentSemaphoreType, setCurrentSemaphoreType] = useState('');
  const [onlyMyRepos, setOnlyMyRepos] = useState(true);
  // const [topCriticalRepos, setTopCriticalRepos] = useState<RepoAlertSummary[]>([]);

  const [onlyCritical, setOnlyCritical] = useState(true);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<Entity[]>([]);
  const [availableSystems, setAvailableSystems] = useState<string[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<string>('all');
  const [systemSearchTerm, setSystemSearchTerm] = useState<string>('');
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);

  const handleClick = (title: string, items: any[]) => {
    setDialogTitle(title);
    setDialogItems(items);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
  };

  const handleSemaphoreClick = (semaphoreType: string) => {
    setCurrentSemaphoreType(semaphoreType);
    setDetailedDialogOpen(true);
  };

  const handleCloseDetailedDialog = () => {
    setDetailedDialogOpen(false);
  };

  const cardAction = (title: string, items: any[]) => (
    <IconButton onClick={() => handleClick(title, items)}>
      <MoreVertIcon />
    </IconButton>
  );

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
          entity: entity,
        }));

        console.log('📋 All loaded catalog components:');
        simplified.forEach(r => {
          console.log(`🧩 ${r.name} | system: ${r.system} | tags: ${r.tags} | owner: ${r.owner}`);
        });

        setRepos(simplified);
        const systems = Array.from(
          new Set(
            simplified.map(repo => repo.system).filter(Boolean) as string[],
          ),
        ).sort();
        setAvailableSystems(systems);
        if (systems.length > 0) {
          const randomSystem =
            systems[Math.floor(Math.random() * systems.length)];
          setSelectedSystem(randomSystem);
        }
        setSelectedRepos(simplified.map(r => r.name));
        setSelectedEntities(simplified.map(r => r.entity));
      } catch (err) {
        console.error('❌ Failed to load catalog entities:', err);
      }
    };

    fetchCatalogRepos();
  }, [catalogApi]);

  // Apply filters when filter settings change
  useEffect(() => {
    const filtered = repos.filter(repo => {
      const isMine = !onlyMyRepos || repo.owner === 'sep-arguspanoptes';
      const isCritical = !onlyCritical || repo.tags?.includes('critical');
      const isInSelectedSystem =
        selectedSystem === 'all' || repo.system === selectedSystem;
      return isMine && isCritical && isInSelectedSystem;
    });

    setSelectedRepos(filtered.map(r => r.name));
    setSelectedEntities(filtered.map(r => r.entity));
  }, [onlyMyRepos, onlyCritical, repos, selectedSystem]);


    // Filter systems based on search term
  // useEffect(() => {
  //   const fetchTopRepos = async () => {
  //     if (!detailedDialogOpen || currentSemaphoreType !== 'Dependabot') return;
  //     if (selectedEntities.length === 0) return;
  
  //     try {
  //       const top5 = await getTop5CriticalDependabotRepos(techInsightsApi, selectedEntities);
  //       setTopCriticalRepos(top5);
  //     } catch (e) {
  //       console.error('❌ Failed to fetch top critical repos', e);
  //     }
  //   };
  
  //   fetchTopRepos();
  // }, [
  //   detailedDialogOpen,
  //   currentSemaphoreType,
  //   selectedEntities,  // ✅ ensures updates when filters change
  //   techInsightsApi,
  // ]);



  // useEffect(() => {
  //   const fetchTopRepos = async () => {
  //     if (!detailedDialogOpen || currentSemaphoreType !== 'Dependabot') return;
  //     if (selectedEntities.length === 0) return;
  
  //     try {
  //       const top5 = await getTop5CriticalDependabotRepos(techInsightsApi, selectedEntities);
  //       setTopCriticalRepos(top5);
  //     } catch (e) {
  //       console.error('❌ Failed to fetch top critical repos', e);
  //     }
  //   };
  
  //   fetchTopRepos();
  // }, [
  //   detailedDialogOpen,
  //   currentSemaphoreType,
  //   selectedEntities,  // ✅ ensures updates when filters change
  //   techInsightsApi,
  // ]);

  const filteredSystems = availableSystems.filter(system =>
    system.toLowerCase().includes(systemSearchTerm.toLowerCase()),
  );

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
              onClick={() => setSystemMenuOpen(true)}
              startIcon={<FilterListIcon />}
              fullWidth
            >
              {selectedSystem === 'all' ? 'All Systems' : selectedSystem}
            </Button>
            <Popover
              open={systemMenuOpen}
              anchorEl={systemMenuButtonRef.current}
              onClose={() => setSystemMenuOpen(false)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              PaperProps={{ style: { width: '300px', maxHeight: '400px' } }}
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
                {filteredSystems.map(system => (
                  <MenuItem
                    key={system}
                    onClick={() => {
                      setSelectedSystem(system);
                      setSystemMenuOpen(false);
                    }}
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

        {selectedRepos.length > 0 && (
          <Box mb={4}>
            <InfoCard title={`Selected Repositories (${selectedRepos.length})`}>
              <Box maxHeight={200} overflow="auto" p={1}>
                <Grid container spacing={1}>
                  {selectedRepos.map(repo => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={repo}>
                      <Typography variant="body2">
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
              action={cardAction('Security Checks', [])}
            >
              <Typography variant="subtitle1">Dependabot</Typography>
                <div>
                  <TrafficLightDependabot
                    entities={selectedEntities}
                    systemName={selectedSystem}
                    onClick={() => handleSemaphoreClick('Dependabot')}
                  />

                </div>
            

              <Typography variant="subtitle1">BlackDuck</Typography>
              <BaseTrafficLight
                color="yellow"
                tooltip="BlackDuck security scan status"
                onClick={() => handleSemaphoreClick('BlackDuck')}
              />

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
            <InfoCard title="Pipelines" action={cardAction('Pipelines', [])}>
              <Typography variant="subtitle1">Reporting Pipeline</Typography>
              <BaseTrafficLight
                color="yellow"
                tooltip="Reporting pipeline status"
                onClick={() => handleSemaphoreClick('Reporting Pipeline')}
              />

              <Typography variant="subtitle1">
                Pre-production pipelines
              </Typography>
              <PreproductionTrafficLight
                entities={selectedEntities}
                onClick={() => handleSemaphoreClick('Pre-Production pipelines')}
              />

              <Typography variant="subtitle1">Foundation pipelines</Typography>
              <FoundationTrafficLight
                entities={selectedEntities}
                onClick={() => handleSemaphoreClick('Foundation pipelines')}
              />
            </InfoCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <InfoCard
              title="Software Quality"
              action={cardAction('Software Quality', [])}
            >
              <Typography variant="subtitle1">SonarQube</Typography>
              <SonarQubeTrafficLight
                entities={selectedEntities}
                onClick={() => handleSemaphoreClick('SonarQube')}
              />

              <Typography variant="subtitle1">CodeScene</Typography>
              <BaseTrafficLight
                color="yellow"
                tooltip="CodeScene code quality status"
                onClick={() => handleSemaphoreClick('CodeScene')}
              />
            </InfoCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <InfoCard
              title="Azure DevOps"
              action={cardAction('Azure DevOps', [])}
            >
              <Typography variant="subtitle1">Bugs</Typography>
              <AzureDevOpsBugsTrafficLight
                onClick={() => handleSemaphoreClick('Azure DevOps Bugs')}
              />
            </InfoCard>
          </Grid>
        </Grid>

        <DialogComponent
          open={dialogOpen}
          onClose={handleClose}
          title={dialogTitle}
          items={dialogItems}
        />

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
