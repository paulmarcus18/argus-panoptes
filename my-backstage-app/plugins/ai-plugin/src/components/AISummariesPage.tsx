import { useEffect, useState } from 'react';
import {
  useApi,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { GoogleGenAI } from '@google/genai';
import {
  Box,
  CircularProgress,
  Typography,
  IconButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { keyframes } from '@emotion/react';
import { generateSummaries } from '../../utils/createAISummary.ts';
import { postSummaries } from '../../utils/saveToDatabase.ts';
import { getReposBySystem } from '../../utils/getReposBySystem.ts';
import { getCommitMessagesBySystem } from '../../utils/getCommitMessagesBySystem.ts';
import { SummaryPerRepo } from 'plugins/ai-plugin/utils/types';
import { SummaryGrid } from './SummaryGrid.tsx';
import { Filters } from './Filters.tsx';

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

type MessagesBySystem = Record<string, SummaryPerRepo[]>;

export const AISummaries = () => {
  const catalogApi = useApi(catalogApiRef);
  const techInsightsApi = useApi(techInsightsApiRef);
  const [messagesBySystem, setMessagesBySystem] = useState<MessagesBySystem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedSystem, setSelectedSystem] = useState<string>('All');
  const [repoSearch, setRepoSearch] = useState<string>('');
  const { fetch } = useApi(fetchApiRef);
  const discoveryApi = useApi(discoveryApiRef);
  const today = new Date().toISOString().split('T')[0];
  const fetchApi = useApi(fetchApiRef); // ✅ call this at top level
  const fetchFn = fetchApi.fetch;

  const callAI = async () => {
      setLoading(true);
      try {
        const apiBaseUrl = await discoveryApi.getBaseUrl('ai-plugin');
        const { items: entities } = await catalogApi.getEntities({ filter: { kind: 'Component' } });
        const systemToEntityRefs = getReposBySystem(entities);
        const commitMessagesBySystem = await getCommitMessagesBySystem(techInsightsApi, systemToEntityRefs);

        
        const result = await generateSummaries(commitMessagesBySystem, apiBaseUrl, fetchFn);
        await postSummaries(result, today, apiBaseUrl, fetch);
        setMessagesBySystem(result);
      } catch (err) {
        console.error('Error in callAI:', err);
      } finally {
        setLoading(false); // ✅ Always turn off loading at the end
      }
  }

  const fetchSummaries = async () => {
    setLoading(true);
    const apiBaseUrl = await discoveryApi.getBaseUrl('ai-plugin');
    const { items: systems } = await catalogApi.getEntities({ filter: { kind: 'System' } });

    try {
      const res = await fetch(`${apiBaseUrl}/summaries?date=${today}`);
      if (res.ok) {
        const data: Record<string, SummaryPerRepo[]> = await res.json();

        for (const entity of systems) {
          const systemName = entity.metadata.name;
          if (!(systemName in data)) {
            data[systemName] = [];
          }
        }

        // Always set data even if empty
        setMessagesBySystem(data);

        const hasAnyData = Object.values(data).some(repos => repos.length > 0);
        if (!hasAnyData) {
          await callAI(); // generate AI if summaries are empty
        }

        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Error fetching summaries:', err);
      await callAI(); // fallback in case of failure
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, []);

  const allSystems = ['All', ...Object.keys(messagesBySystem ?? {})];

  const getFilteredMessages = (): MessagesBySystem => {
    if (!messagesBySystem) return {};
    const result: MessagesBySystem = {};
    for (const [system, repos] of Object.entries(messagesBySystem)) {
      if (selectedSystem !== 'All' && system !== selectedSystem) continue;
      result[system] = repos;
    }
    return result;
  };

  const filteredMessages = getFilteredMessages();

  const handleDownload = (system: string) => {
  const data = messagesBySystem?.[system]
    ?.map(repo => `${repo.repoName}:\n${repo.summary}\n\n`)
    .join('');

  const blob = new Blob([data ?? ''], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${system}-summaries.txt`;
  link.click();
};

  return (
    <Box sx={{ padding: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 4 }}>
        <Typography variant="h4" color="text.primary" sx={{ flexGrow: 1 }}>
          AI Generated Release Notes
        </Typography>
        <IconButton
          onClick={callAI}
          aria-label="refresh"
          sx={{ backgroundColor: 'transparent', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }, padding: 1 }}
        >
          <RefreshIcon sx={{ animation: loading ? `${spin} 1s linear infinite` : 'none' }} />
        </IconButton>
      </Box>

      <Filters
        allSystems={allSystems}
        selectedSystem={selectedSystem}
        onSystemChange={setSelectedSystem}
        repoSearch={repoSearch}
        onRepoSearchChange={setRepoSearch}
      />

      {loading || !messagesBySystem ? (
        <Box display="flex" justifyContent="center" alignItems="center" mt={5}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading release notes...</Typography>
        </Box>
      ) : Object.keys(filteredMessages).length === 0 ? (
        <Typography variant="body1" color="text.secondary">
          No systems match your filters.
        </Typography>
      ) : (
        <SummaryGrid
      filteredMessages={filteredMessages}
      fullMessages={messagesBySystem}
      repoSearch={repoSearch}
      handleDownload={handleDownload}
    />
      )}
    </Box>
  );
};

