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
import IconButton from '@mui/material/IconButton';

interface SummaryPerRepo {
  repoName: string;
  summary: string;
}

type MessagesBySystem = Record<string, SummaryPerRepo[]>;

const mockSummaries: MessagesBySystem = {
  'Payments System': [
    {
      repoName: 'payment-service',
      summary: '• Refactored transaction flow\n• Fixed race condition\n• Improved error logging',
    },
    {
      repoName: 'invoice-generator',
      summary: '• Improved invoice formatting\n• Migrated to new date library\n• Removed deprecated fields',
    },
  ],
  'User Management': [
    {
      repoName: 'user-profile-service',
      summary: '• Added avatar upload\n• Sanitized input fields\n• Fixed user delete bug',
    },
    {
      repoName: 'auth-service',
      summary: '• Implemented OAuth2\n• Improved session validation\n• Upgraded encryption',
    },
  ],
  'Order System': [
    {
      repoName: 'order-tracker',
      summary: '• Improved ETA calculations\n• Added email notifications\n• Reworked retry logic',
    },
    {
      repoName: 'order-api',
      summary: '• Cleaned Swagger docs\n• Improved validation\n• Fixed timezone bug',
    },
    {
      repoName: 'order-ingestion',
      summary: '• Added Kafka retry policy\n• Enhanced logging\n• Batched insert operations',
    },
    {
      repoName: 'order-metrics',
      summary: '• Added Grafana dashboard\n• Refactored Prometheus exporters\n• Reduced metrics latency',
    },
  ],
  'Inventory Service': [
    {
      repoName: 'stock-manager',
      summary: '• Optimized lookup queries\n• Added low-stock alerts\n• Improved performance',
    },
  ],
  'Notifications': [],
};



export const CommitMessageTestPage = () => {
  const catalogApi = useApi(catalogApiRef);
  const techInsightsApi = useApi(techInsightsApiRef);
  const [messagesBySystem, setMessagesBySystem] = useState<MessagesBySystem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedSystem, setSelectedSystem] = useState<string>('All');
  const [repoSearch, setRepoSearch] = useState<string>('');

  const fetchSummaries = async () => {
    setLoading(true);
    setTimeout(() => {
      setMessagesBySystem(mockSummaries);
      setLoading(false);
      console.log('📬 Mock messages loaded');
    }, 800);

    // const result = await generateSummaries(catalogApi, techInsightsApi);
    // setMessagesBySystem(result);
    // setLoading(false);
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
      Commit Summaries by System
    </Typography>
    <IconButton
      onClick={fetchSummaries}
      aria-label="refresh"
      sx={{
        backgroundColor: 'transparent',
        '&:hover': {
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
        },
        boxShadow: 'none',
        padding: 1,
      }}
    >
      <RefreshIcon />
    </IconButton>
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
                height: '180mm', // Dynamic height based on content
                position: 'relative',
                margin: '0 10px',
              }}
            >
              {/* Download Button */}
              <IconButton
                onClick={() => handleDownload(system)}
                aria-label="download"
                sx={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  backgroundColor: 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                  width: 40,
                  height: 40,
                  padding: 1,
                }}
              >
                <DownloadIcon />
              </IconButton>

              <CardContent
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <Typography variant="h5" color="secondary" gutterBottom>
                  {system}
                </Typography>

                <Box
                  sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  {repos.length === 0 ? (
                    <Typography variant="body1" color="text.secondary">
                      No new releases.
                    </Typography>
                  ) : (
                    repos
                      .filter(repo =>
                        repo.repoName.toLowerCase().includes(repoSearch.toLowerCase())
                      )
                      .map(({ repoName, summary }) => (
                        <Box key={repoName}>
                          <Typography variant="h6" color="primary" gutterBottom>
                            {repoName}
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{
                              whiteSpace: 'pre-wrap',
                              fontSize: '1.3rem',
                              lineHeight: '1.5',
                            }}
                          >
                            {summary}
                          </Typography>
                        </Box>
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
