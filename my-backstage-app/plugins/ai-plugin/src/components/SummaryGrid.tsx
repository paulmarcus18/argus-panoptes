import React from 'react';
import {
  Box,
  Card,
  CardContent,
  IconButton,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { SummaryPerRepo } from '../../utils/types';

type MessagesBySystem = Record<string, SummaryPerRepo[]>;

interface SummaryGridProps {
  filteredMessages: MessagesBySystem;
  fullMessages: MessagesBySystem;
  repoSearch: string;
  handleDownload: (system: string) => void;
}

export const SummaryGrid = ({
  filteredMessages,
  fullMessages,
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
        {Object.entries(filteredMessages).map(([system, repos]) => (
          <Card
            key={system}
            elevation={3}
            sx={{
              width: '100%',
              height: '180mm',
              position: 'relative',
            }}
          >
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
              <Typography variant="h4" color="#83a2f2" gutterBottom>
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
                  <Box
                    sx={{
                      backgroundColor: '#fff',
                      borderRadius: 2,
                      padding: 2,
                      boxShadow: 1,
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    {repos
                      .filter(repo =>
                        repo.repoName
                          .toLowerCase()
                          .includes(repoSearch.toLowerCase()),
                      )
                      .map(({ repoName, summary }) => (
                        <Box key={repoName} sx={{ marginBottom: 2 }}>
                          <Typography variant="h5" color="black" gutterBottom>
                            {repoName}
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{
                              whiteSpace: 'pre-wrap',
                              fontSize: '1.2rem',
                              lineHeight: '1.5',
                              color: 'black',
                            }}
                          >
                            {summary}
                          </Typography>
                        </Box>
                      ))}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};
