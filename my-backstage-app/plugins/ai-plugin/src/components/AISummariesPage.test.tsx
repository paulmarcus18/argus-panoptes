import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AISummaries } from './AISummariesPage';
import { TestApiProvider } from '@backstage/test-utils';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import {
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';

const mockCatalogApi = {
  getEntities: jest.fn().mockResolvedValue({ items: [] }),
};

const mockTechInsightsApi = {};

const mockDiscoveryApi = {
  getBaseUrl: jest.fn().mockResolvedValue('http://localhost:7007/api/ai-plugin'),
};

const mockFetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    system1: [
      {
        repoName: 'repo-a',
        summary: 'Summary A',
      },
    ],
    system2: [],
  }),
});

const renderComponent = () =>
  render(
    <TestApiProvider
      apis={[
        [catalogApiRef, mockCatalogApi],
        [techInsightsApiRef, mockTechInsightsApi],
        [discoveryApiRef, mockDiscoveryApi],
        [fetchApiRef, { fetch: mockFetch }],
      ]}
    >
      <AISummaries />
    </TestApiProvider>
  );

describe('AISummaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

    it('renders loading spinner initially', async () => {
        renderComponent();
        expect(screen.getByText(/Loading release notes/i)).toBeInTheDocument();

        await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    });

    it('displays fetched summaries correctly', async () => {
        renderComponent();

        await waitFor(() => {
        expect(screen.getByText('repo-a')).toBeInTheDocument();
        expect(screen.getByText('Summary A')).toBeInTheDocument();
        });
    });

    it('filters systems correctly via dropdown', async () => {
        renderComponent();
        await screen.findByText('repo-a');

        // Simulate selecting system2 via dropdown
        const systemFilter = screen.getByRole('combobox', { name: /System/i });
        userEvent.click(systemFilter);

        const option = await screen.findByText('system2');
        userEvent.click(option);

        await waitFor(() =>
        expect(screen.getByText('No new releases.')).toBeInTheDocument()
        );
    });

    it('calls callAI when refresh is clicked', async () => {
        renderComponent();
        const refreshBtn = await screen.findByLabelText('refresh');
        userEvent.click(refreshBtn);

        await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    });

});
