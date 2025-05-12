import React, { useEffect, useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { generateSummaries } from '../../utils/createAISummary';

import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';

interface SummaryPerRepo {
  repoName: string;
  summary: string;
}

type MessagesBySystem = Record<string, SummaryPerRepo[]>;

const mockSummaries: MessagesBySystem = {
  'Payments System': [
    {
      repoName: 'payment-service',
      summary: '✅ Refactored transaction flow...\n🐞 Fixed race condition...',
    },
    {
      repoName: 'invoice-generator',
      summary: '🧾 Improved invoice formatting...\n🛠️ Migrated date library...',
    },
  ],
  'User Management': [],
  'Order System': [
    {
      repoName: 'order-tracker',
      summary: '📦 Improved shipment ETA...\n📬 Added email notifications...',
    },
  ],
};

export const CommitMessageTestPage = () => {
  const catalogApi = useApi(catalogApiRef);
  const techInsightsApi = useApi(techInsightsApiRef);
  const [messagesBySystem, setMessagesBySystem] = useState<MessagesBySystem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedSystem, setSelectedSystem] = useState<string>('All');
  const [repoSearch, setRepoSearch] = useState<string>('');

  const fetchSummaries = async () => {
    // setLoading(true);
    // setTimeout(() => {
    //   setMessagesBySystem(mockSummaries);
    //   setLoading(false);
    //   console.log('📬 Mock messages loaded');
    // }, 800);

    const result = await generateSummaries(catalogApi, techInsightsApi);
    setMessagesBySystem(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchSummaries();
  }, []);

  const allSystems = ['All', ...Object.keys(messagesBySystem ?? {})];

  const getFilteredMessages = (): MessagesBySystem => {
    if (!messagesBySystem) return {};
    const result: MessagesBySystem = {};

    for (const [system, repos] of Object.entries(messagesBySystem)) {
      // System filter
      if (selectedSystem !== 'All' && system !== selectedSystem) continue;

      result[system] = repos; // include even if empty
    }

    return result;
  };

  const filteredMessages = getFilteredMessages();

  const handleDownload = (system: string) => {
    const data = messagesBySystem?.[system]
      ?.map(
        repo =>
          `${repo.repoName}:\n${repo.summary}\n\n`
      )
      .join('');

    const blob = new Blob([data ?? ''], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${system}-summaries.txt`;
    link.click();
  };

  return (
    <Box sx={{ padding: 4 }}>
      {/* Header + Refresh */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 4 }}>
        <Typography variant="h4" color="primary" sx={{ flexGrow: 1 }}>
          💌 Commit Summaries by System
        </Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchSummaries}>
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, marginBottom: 4 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="system-filter-label">System</InputLabel>
          <Select
            labelId="system-filter-label"
            value={selectedSystem}
            label="System"
            onChange={e => setSelectedSystem(e.target.value)}
          >
            {allSystems.map(system => (
              <MenuItem key={system} value={system}>
                {system}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Search Repo"
          variant="outlined"
          value={repoSearch}
          onChange={e => setRepoSearch(e.target.value)}
        />
      </Box>

      {/* Content */}
      {loading || !messagesBySystem ? (
        <Box display="flex" justifyContent="center" alignItems="center" mt={5}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading commit summaries...</Typography>
        </Box>
      ) : Object.keys(filteredMessages).length === 0 ? (
        <Typography variant="body1" color="text.secondary">
          No systems match your filters.
        </Typography>
      ) : (
        <Box sx={{ overflowX: 'auto', paddingBottom: '20px' }}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'nowrap', // Prevent wrapping
              gap: '20px', // Add space between cards
              paddingBottom: '10px',
            }}
          >
            {Object.entries(filteredMessages).map(([system, repos]) => (
              <Box key={system} sx={{ flexShrink: 0 }}>
                <Card
                  elevation={3}
                  sx={{
                    width: '140mm', // A4 size width (scaled down)
                    height: '180mm', // A4 size height (scaled down)
                    position: 'relative',
                    margin: '0 10px',
                  }}
                >
                  {/* Download Button */}
                  <Button
                    sx={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      width: 40,
                      height: 40,
                      padding: 0,
                      minWidth: 'unset',
                      borderRadius: '8px',
                      backgroundColor: '#fff',
                    }}
                    variant="contained"
                    onClick={() => handleDownload(system)}
                  >
                    <DownloadIcon />
                  </Button>

                  <CardContent>
                    <Typography variant="h5" color="secondary" gutterBottom>
                      {system}
                    </Typography>

                    {/* Repos container (vertical stack) */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {repos.length === 0 ? (
                        <Card sx={{ padding: 2 }}>
                          <Typography variant="body1" color="text.secondary">
                            No new releases.
                          </Typography>
                        </Card>
                      ) : (
                        repos
                          .filter(repo =>
                            repo.repoName.toLowerCase().includes(repoSearch.toLowerCase())
                          )
                          .map(({ repoName, summary }) => (
                            <Card key={repoName} sx={{ padding: 2 }}>
                              <Typography variant="h6" gutterBottom>
                                {repoName}
                              </Typography>
                              <Box
                                sx={{
                                  backgroundColor: '#f5f5f5',
                                  color: 'black',
                                  padding: 2,
                                  borderRadius: 1,
                                  whiteSpace: 'pre-wrap',
                                  fontSize: '0.9rem',
                                  maxHeight: 200,
                                  overflowY: 'auto',
                                }}
                              >
                                {summary}
                              </Box>
                            </Card>
                          ))
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};
