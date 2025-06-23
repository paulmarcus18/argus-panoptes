import Box from '@mui/material/Box';
import { SummaryPerRepo } from '../../utils/types';
import { SummaryCard } from './SummaryCard';

type MessagesBySystem = Record<string, SummaryPerRepo[]>;

interface SummaryGridProps {
  filteredMessages: MessagesBySystem;
  fullMessages: MessagesBySystem; // Can be removed if unused
  repoSearch: string;
  handleDownload: (system: string) => void;
}

export const SummaryGrid = ({
  filteredMessages,
  repoSearch,
  handleDownload,
}: SummaryGridProps) => {
  return (
    <Box sx={{ paddingBottom: '20px' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr',
            md: '1fr 1fr',
          },
          gap: 2,
        }}
      >
        {Object.entries(filteredMessages)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([system, repos]) => (
            <SummaryCard
              key={system}
              system={system}
              repos={repos}
              repoSearch={repoSearch}
              handleDownload={handleDownload}
            />
          ))}
      </Box>
    </Box>
  );
};
