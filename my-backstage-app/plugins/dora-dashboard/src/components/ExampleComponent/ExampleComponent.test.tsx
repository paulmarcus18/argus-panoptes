import React from 'react';
import { screen } from '@testing-library/react';
import { renderInTestApp } from '@backstage/test-utils';
import { ExampleComponent } from './ExampleComponent';

// Mock the hooks used in DoraDashboard
jest.mock('../ExampleFetchComponent/ExampleFetchComponent', () => ({
  useProjects: () => ({
    loading: false,
    error: null,
    value: ['project-alpha', 'project-beta'],
  }),
  useMetricsData: () => ({
    loading: false,
    error: null,
    value: [
      { id: 'df', dataPoints: [{ key: '2025-01', value: 10 }] },
      { id: 'mltc', dataPoints: [{ key: '2025-01', value: 20 }] },
      { id: 'cfr', dataPoints: [] },
      { id: 'mttr', dataPoints: [] },
    ],
  }),
}));

describe('ExampleComponent', () => {
  it('renders dashboard title and metric labels', async () => {
    await renderInTestApp(<ExampleComponent />);

    const headings = await screen.findAllByText(/DORA Metrics Dashboard/i);
    expect(headings.length).toBeGreaterThanOrEqual(2);

    expect(screen.getByText(/Deployment Frequency/i)).toBeInTheDocument();
    expect(screen.getByText(/Lead Time for Changes/i)).toBeInTheDocument();
  });
});
