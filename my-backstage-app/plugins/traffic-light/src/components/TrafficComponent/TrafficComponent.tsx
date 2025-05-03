import React, { useState, useEffect } from 'react';
import {
  Typography,
  Grid,
  Box,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Tooltip,
  IconButton,
} from '@material-ui/core';
import MoreVertIcon from '@material-ui/icons/MoreVert';

import { Header, Page, Content, InfoCard } from '@backstage/core-components';
import { RepoFetchComponent } from '../RepoFetchComponent';
import { fetchRepoStatus, StatusResponse } from '../api/mockStatusApi';
import { DialogComponent } from '../DialogComponent';

const TrafficLight = ({ color }: { color: 'red' | 'green' | 'yellow' }) => (
  <Box my={1} width={50} height={50} borderRadius="50%" bgcolor={color} />
);

interface Props {
  owner: string;
  repo: string;
}

const Trafficlightdependabot = ({ owner, repo }: Props) => {
  const [color, setColor] = useState<'green' | 'red' | 'gray'>('gray');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/traffic-light/dependabotStatus/${owner}/${repo}`);
        if (!res.ok) {
          throw new Error('Failed to fetch status');
        }
        const data = await res.json();
        if (['green', 'red'].includes(data.status)) {
          setColor(data.status);
        } else {
          setColor('gray');
        }
      } catch (err) {
        console.error(`Failed to fetch dependabot status for ${repo}:`, err);
        setColor('gray');
      }
    };

    fetchStatus();
  }, [owner, repo]);

  return (
    <Box my={1} width={50} height={50} borderRadius="50%" bgcolor={color} />
  );
};

export const TrafficComponent = () => {
  const [repos, setRepos] = useState<{ name: string; description: string }[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [statusData, setStatusData] = useState<StatusResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogItems, setDialogItems] = useState<{ name: string; color: string }[]>([]);

  const selected = repos.find(r => r.name === selectedRepo);

  const handleClick = (
    title: string,
    items: { name: string; color: string }[],
  ) => {
    setDialogTitle(title);
    setDialogItems(items);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
  };

  const cardAction = (
    title: string,
    items: { name: string; color: string }[],
  ) => (
    <IconButton onClick={() => handleClick(title, items)}>
      <MoreVertIcon />
    </IconButton>
  );

  return (
    <Page themeId="tool">
      <Header title="Traffic light plugin" subtitle="">
        <Box width={300} ml={4}>
          <FormControl fullWidth size="small" variant="outlined">
            <InputLabel id="repo-select-label">Repository</InputLabel>
            <Select
              labelId="repo-select-label"
              value={selectedRepo}
              onChange={e => setSelectedRepo(e.target.value as string)}
              label="Repository"
            >
              {repos.map(repo => (
                <MenuItem key={repo.name} value={repo.name}>
                  {repo.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Header>

      <Content>
        {selected && (
          <>
            <Box mb={4}>
              <InfoCard title="GitHub Repository">
                <Typography variant="h6">{selected.name}</Typography>
                <Typography variant="body2">{selected.description}</Typography>
              </InfoCard>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <InfoCard
                  title="Security Checks"
                  action={cardAction('Security Checks', [
                    { name: 'Dependabot', color: 'gray' },
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
                        owner="philips-labs"
                        repo={selectedRepo}
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
                      color:
                        statusData?.['Reporting Pipeline']?.color || 'yellow',
                    },
                  ])}
                >
                  <Typography variant="subtitle1">
                    Reporting Pipeline
                  </Typography>
                  <Tooltip
                    title={statusData?.['Reporting Pipeline']?.reason || ''}
                  >
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
                        statusData?.['Pre-Production pipelines']?.color ||
                        'yellow',
                    },
                  ])}
                >
                  <Typography variant="subtitle1">
                    Pre-Production pipelines
                  </Typography>
                  <Tooltip
                    title={
                      statusData?.['Pre-Production pipelines']?.reason || ''
                    }
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
                        statusData?.['Foundation Pipelines']?.color ||
                        'yellow',
                    },
                  ])}
                >
                  <Typography variant="subtitle1">
                    Foundation Pipelines
                  </Typography>
                  <Tooltip
                    title={statusData?.['Foundation Pipelines']?.reason || ''}
                  >
                    <div>
                      <TrafficLight
                        color={
                          statusData?.['Foundation Pipelines']?.color ||
                          'yellow'
                        }
                      />
                    </div>
                  </Tooltip>
                </InfoCard>
              </Grid>
            </Grid>
          </>
        )}

        <RepoFetchComponent onData={setRepos} />

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
