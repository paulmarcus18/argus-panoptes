// plugins/traffic-light/src/components/Semaphores/tests/DependabotTrafficLight.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import { TrafficLightDependabot } from '../TrafficLightDependabot';
import { techInsightsApiRef, TechInsightsApi } from '@backstage/plugin-tech-insights';
import { TestApiProvider } from '@backstage/test-utils';
import { Entity } from '@backstage/catalog-model';
import { DependabotUtils } from '../../../utils/dependabotUtils';

// Mock DependabotUtils class
jest.mock('../../../utils/dependabotUtils');

// Correctly typed mock API
const mockTechInsightsApi: jest.Mocked<Partial<TechInsightsApi>> = {
  getFacts: jest.fn(),
};

// Mock Entities
const mockEntities: Entity[] = [
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'repo-1',
      namespace: 'default',
    },
    spec: {
      system: 'mock-system',
    },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'repo-2',
      namespace: 'default',
    },
    spec: {
      system: 'mock-system',
    },
  },
];

describe('TrafficLightDependabot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <TestApiProvider apis={[[techInsightsApiRef, mockTechInsightsApi]]}>
        <TrafficLightDependabot
          systemName="mock-system"
          entities={mockEntities}
        />
      </TestApiProvider>,
    );

  it('renders gray light if no entities are passed', async () => {
    render(
      <TestApiProvider apis={[[techInsightsApiRef, mockTechInsightsApi]]}>
        <TrafficLightDependabot systemName="mock-system" entities={[]} />
      </TestApiProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveAttribute(
        'title',
        'No entities selected',
      );
    });
  });

  it('shows green light when all checks pass', async () => {
    (DependabotUtils as jest.Mock).mockImplementation(() => ({
      getDependabotChecks: jest.fn().mockResolvedValue({
        criticalAlertCheck: true,
        highAlertCheck: true,
        mediumAlertCheck: true,
      }),
    }));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveAttribute(
        'title',
        'All dependabot checks passed',
      );
    });
  });

  it('shows red light when at least one critical check fails', async () => {
    (DependabotUtils as jest.Mock).mockImplementation(() => ({
      getDependabotChecks: jest
        .fn()
        .mockResolvedValueOnce({
          criticalAlertCheck: false,
          highAlertCheck: true,
          mediumAlertCheck: true,
        })
        .mockResolvedValueOnce({
          criticalAlertCheck: true,
          highAlertCheck: true,
          mediumAlertCheck: true,
        }),
    }));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveAttribute(
        'title',
        'Critical alerts exceed threshold (1 >  0)',
      );
    });
  });

  it('shows yellow light when critical passes but high fails', async () => {
    (DependabotUtils as jest.Mock).mockImplementation(() => ({
      getDependabotChecks: jest
        .fn()
        .mockResolvedValueOnce({
          criticalAlertCheck: true,
          highAlertCheck: false,
          mediumAlertCheck: true,
        })
        .mockResolvedValueOnce({
          criticalAlertCheck: true,
          highAlertCheck: true,
          mediumAlertCheck: true,
        }),
    }));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveAttribute(
        'title',
        '0 minor critical issues in dependabot alerts',
      );
    });
  });

  it('shows gray light on fetch error', async () => {
    (DependabotUtils as jest.Mock).mockImplementation(() => ({
      getDependabotChecks: jest.fn().mockRejectedValue(new Error('fetch error')),
    }));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveAttribute(
        'title',
        'Error fetching dependabot data',
      );
    });
  });
});
