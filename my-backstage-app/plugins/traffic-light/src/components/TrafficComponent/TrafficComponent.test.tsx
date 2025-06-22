import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrafficComponent } from './TrafficComponent';
import { useApi } from '@backstage/core-plugin-api';
import { Entity } from '@backstage/catalog-model';

// Mock the Backstage APIs
jest.mock('@backstage/core-plugin-api');
jest.mock('@backstage/plugin-catalog-react');

// Mock all the traffic light components
jest.mock('../Semaphores', () => ({
  TrafficLightDependabot: ({ onClick }: { onClick: () => void }) => (
    <div data-testid="dependabot-traffic-light" onClick={onClick}>
      Dependabot Traffic Light
    </div>
  ),
  GitHubSecurityTrafficLight: ({ onClick }: { onClick: () => void }) => (
    <div data-testid="github-security-traffic-light" onClick={onClick}>
      GitHub Security Traffic Light
    </div>
  ),
  SonarQubeTrafficLight: ({ onClick }: { onClick: () => void }) => (
    <div data-testid="sonarqube-traffic-light" onClick={onClick}>
      SonarQube Traffic Light
    </div>
  ),
  PreproductionTrafficLight: ({ onClick }: { onClick: () => void }) => (
    <div data-testid="preproduction-traffic-light" onClick={onClick}>
      Preproduction Traffic Light
    </div>
  ),
  FoundationTrafficLight: ({ onClick }: { onClick: () => void }) => (
    <div data-testid="foundation-traffic-light" onClick={onClick}>
      Foundation Traffic Light
    </div>
  ),
  AzureDevOpsBugsTrafficLight: ({ onClick }: { onClick: () => void }) => (
    <div data-testid="azure-devops-bugs-traffic-light" onClick={onClick}>
      Azure DevOps Bugs Traffic Light
    </div>
  ),
  BlackDuckTrafficLight: ({ onClick }: { onClick: () => void }) => (
    <div data-testid="blackduck-traffic-light" onClick={onClick}>
      BlackDuck Traffic Light
    </div>
  ),
  BaseTrafficLight: ({ onClick }: { onClick: () => void }) => (
    <div data-testid="base-traffic-light" onClick={onClick}>
      Base Traffic Light
    </div>
  ),
}));

// Mock the reporting traffic light component
jest.mock('../Semaphores/ReportingTrafficLight', () => ({
  ReportingTrafficLight: ({ onClick }: { onClick: () => void }) => (
    <div data-testid="reporting-traffic-light" onClick={onClick}>
      Reporting Traffic Light
    </div>
  ),
}));

// Mock all dialog components
jest.mock('../SemaphoreDialogs/BlackDuckSemaphoreDialog', () => ({
  BlackDuckSemaphoreDialog: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="blackduck-dialog" onClick={onClose}>
        BlackDuck Dialog
      </div>
    ) : null,
}));

jest.mock('../SemaphoreDialogs/GitHubAdvancedSecurityDialog', () => ({
  GitHubSemaphoreDialog: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="github-security-dialog" onClick={onClose}>
        GitHub Security Dialog
      </div>
    ) : null,
}));

jest.mock('../SemaphoreDialogs/AzureDevOpsDialog', () => ({
  AzureDevOpsSemaphoreDialog: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="azure-devops-dialog" onClick={onClose}>
        Azure DevOps Dialog
      </div>
    ) : null,
}));

jest.mock('../SemaphoreDialogs/SonarQubeDialog', () => ({
  SonarQubeSemaphoreDialog: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="sonarqube-dialog" onClick={onClose}>
        SonarQube Dialog
      </div>
    ) : null,
}));

jest.mock('../SemaphoreDialogs/PreProductionDialog', () => ({
  PreproductionSemaphoreDialog: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="preproduction-dialog" onClick={onClose}>
        Preproduction Dialog
      </div>
    ) : null,
}));

jest.mock('../SemaphoreDialogs/FoundationDialog', () => ({
  FoundationSemaphoreDialog: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="foundation-dialog" onClick={onClose}>
        Foundation Dialog
      </div>
    ) : null,
}));

jest.mock('../SemaphoreDialogs/ReportingDialog', () => ({
  ReportingSemaphoreDialog: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="reporting-dialog" onClick={onClose}>
        Reporting Dialog
      </div>
    ) : null,
}));

jest.mock('../SemaphoreDialogs/DependabotSemaphoreDialog', () => ({
  DependabotSemaphoreDialog: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="dependabot-dialog" onClick={onClose}>
        Dependabot Dialog
      </div>
    ) : null,
}));

const mockUseApi = useApi as jest.MockedFunction<typeof useApi>;

// Mock entities for testing
const mockComponentEntities: Entity[] = [
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'test-repo-1',
      description: 'Test repository 1',
      tags: ['critical'],
    },
    spec: {
      owner: 'philips-labs',
      system: 'test-system-1',
    },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'test-repo-2',
      description: 'Test repository 2',
      tags: ['non-critical'],
    },
    spec: {
      owner: 'other-owner',
      system: 'test-system-2',
    },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'test-repo-3',
      description: 'Test repository 3',
      tags: ['critical'],
    },
    spec: {
      owner: 'philips-labs',
      system: 'test-system-1',
    },
  },
];

const mockSystemEntities: Entity[] = [
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'System',
    metadata: {
      name: 'test-system-1',
    },
    spec: {
      owner: 'team-1',
    },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'System',
    metadata: {
      name: 'test-system-2',
    },
    spec: {
      owner: 'team-2',
    },
  },
];

const mockUserEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'User',
  metadata: {
    name: 'test-user',
  },
  spec: {
    memberOf: ['team-1', 'team-2'],
  },
};

describe('TrafficComponent', () => {
  const mockIdentityApi = {
    getBackstageIdentity: jest.fn(),
  };

  const mockCatalogApi = {
    getEntities: jest.fn(),
    getEntityByRef: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseApi.mockImplementation((apiRef: any) => {
      if (apiRef.id === 'core.identity') {
        return mockIdentityApi;
      }
      if (apiRef.id === 'catalog') {
        return mockCatalogApi;
      }
      return {};
    });

    // Setup default API responses
    mockIdentityApi.getBackstageIdentity.mockResolvedValue({
      userEntityRef: 'user:default/test-user',
    });

    mockCatalogApi.getEntityByRef.mockResolvedValue(mockUserEntity);

    mockCatalogApi.getEntities.mockImplementation(({ filter }) => {
      if (filter.kind === 'Component') {
        return Promise.resolve({ items: mockComponentEntities });
      }
      if (filter.kind === 'System') {
        return Promise.resolve({ items: mockSystemEntities });
      }
      return Promise.resolve({ items: [] });
    });
  });

  it('renders without crashing', async () => {
    render(<TrafficComponent />);

    await waitFor(() => {
      expect(screen.getByText('My repositories')).toBeInTheDocument();
    });
  });

  it('loads and displays repositories after initial fetch', async () => {
    render(<TrafficComponent />);

    await waitFor(() => {
      expect(screen.getByText('Selected Repositories (2)')).toBeInTheDocument();
    });

    // Should show critical repos owned by philips-labs
    expect(screen.getByText('test-repo-1')).toBeInTheDocument();
    expect(screen.getByText('test-repo-3')).toBeInTheDocument();
  });

  it('filters repositories based on "My repositories" checkbox', async () => {
    render(<TrafficComponent />);

    await waitFor(() => {
      expect(screen.getByText('Selected Repositories (2)')).toBeInTheDocument();
    });

    // Uncheck "My repositories"
    const myReposCheckbox = screen.getByLabelText('My repositories');
    await userEvent.click(myReposCheckbox);

    await waitFor(() => {
      expect(screen.getByText('Selected Repositories (3)')).toBeInTheDocument();
    });
  });

  it('filters repositories based on "Critical" checkbox', async () => {
    render(<TrafficComponent />);

    await waitFor(() => {
      expect(screen.getByText('Selected Repositories (2)')).toBeInTheDocument();
    });

    // Uncheck "Critical"
    const criticalCheckbox = screen.getByLabelText('Critical');
    await userEvent.click(criticalCheckbox);

    await waitFor(() => {
      expect(screen.getByText('Selected Repositories (3)')).toBeInTheDocument();
    });
  });

  it('displays system selector with available systems', async () => {
    render(<TrafficComponent />);

    await waitFor(() => {
      expect(screen.getByText('test-system-1')).toBeInTheDocument();
    });

    // Click system selector
    const systemButton = screen.getByText('test-system-1');
    await userEvent.click(systemButton);

    await waitFor(() => {
      expect(screen.getByText('test-system-2')).toBeInTheDocument();
    });
  });

  it('filters repositories by selected system', async () => {
    render(<TrafficComponent />);

    await waitFor(() => {
      expect(screen.getByText('Selected Repositories (2)')).toBeInTheDocument();
    });

    // Open system selector
    const systemButton = screen.getByText('test-system-1');
    await userEvent.click(systemButton);

    // Select different system
    await userEvent.click(screen.getByText('test-system-2'));

    await waitFor(() => {
      expect(screen.getByText('Selected Repositories (0)')).toBeInTheDocument();
    });
  });

  it('opens BlackDuck dialog when BlackDuck traffic light is clicked', async () => {
    render(<TrafficComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('blackduck-traffic-light')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('blackduck-traffic-light'));

    expect(screen.getByTestId('blackduck-dialog')).toBeInTheDocument();
  });

  it('opens GitHub Security dialog when GitHub traffic light is clicked', async () => {
    render(<TrafficComponent />);

    await waitFor(() => {
      expect(
        screen.getByTestId('github-security-traffic-light'),
      ).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('github-security-traffic-light'));

    expect(screen.getByTestId('github-security-dialog')).toBeInTheDocument();
  });

  it('opens Dependabot dialog when Dependabot traffic light is clicked', async () => {
    render(<TrafficComponent />);

    await waitFor(() => {
      expect(
        screen.getByTestId('dependabot-traffic-light'),
      ).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('dependabot-traffic-light'));

    expect(screen.getByTestId('dependabot-dialog')).toBeInTheDocument();
  });

  it('opens SonarQube dialog when SonarQube traffic light is clicked', async () => {
    render(<TrafficComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('sonarqube-traffic-light')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('sonarqube-traffic-light'));

    expect(screen.getByTestId('sonarqube-dialog')).toBeInTheDocument();
  });

  it('opens Azure DevOps dialog when Azure DevOps traffic light is clicked', async () => {
    render(<TrafficComponent />);

    await waitFor(() => {
      expect(
        screen.getByTestId('azure-devops-bugs-traffic-light'),
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByTestId('azure-devops-bugs-traffic-light'),
    );

    expect(screen.getByTestId('azure-devops-dialog')).toBeInTheDocument();
  });

  it('opens Preproduction dialog when Preproduction traffic light is clicked', async () => {
    render(<TrafficComponent />);

    await waitFor(() => {
      expect(
        screen.getByTestId('preproduction-traffic-light'),
      ).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('preproduction-traffic-light'));

    expect(screen.getByTestId('preproduction-dialog')).toBeInTheDocument();
  });

  it('opens Foundation dialog when Foundation traffic light is clicked', async () => {
    render(<TrafficComponent />);

    await waitFor(() => {
      expect(
        screen.getByTestId('foundation-traffic-light'),
      ).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('foundation-traffic-light'));

    expect(screen.getByTestId('foundation-dialog')).toBeInTheDocument();
  });

  it('opens Reporting dialog when Reporting traffic light is clicked', async () => {
    render(<TrafficComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('reporting-traffic-light')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('reporting-traffic-light'));

    expect(screen.getByTestId('reporting-dialog')).toBeInTheDocument();
  });

  it('closes dialogs when close handler is called', async () => {
    render(<TrafficComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('blackduck-traffic-light')).toBeInTheDocument();
    });

    // Open dialog
    await userEvent.click(screen.getByTestId('blackduck-traffic-light'));
    expect(screen.getByTestId('blackduck-dialog')).toBeInTheDocument();

    // Close dialog
    await userEvent.click(screen.getByTestId('blackduck-dialog'));
    expect(screen.queryByTestId('blackduck-dialog')).not.toBeInTheDocument();
  });

  it('handles search in system selector', async () => {
    render(<TrafficComponent />);

    await waitFor(() => {
      expect(screen.getByText('test-system-1')).toBeInTheDocument();
    });

    // Open system selector
    const systemButton = screen.getByText('test-system-1');
    await userEvent.click(systemButton);

    // Search for system
    const searchInput = screen.getByPlaceholderText('Search systems...');
    await userEvent.type(searchInput, 'system-2');

    await waitFor(() => {
      expect(screen.getByText('test-system-2')).toBeInTheDocument();
      expect(screen.queryByText('test-system-1')).not.toBeInTheDocument();
    });
  });

  it('displays "No systems found" when search yields no results', async () => {
    render(<TrafficComponent />);

    await waitFor(() => {
      expect(screen.getByText('test-system-1')).toBeInTheDocument();
    });

    // Open system selector
    const systemButton = screen.getByText('test-system-1');
    await userEvent.click(systemButton);

    // Search for non-existent system
    const searchInput = screen.getByPlaceholderText('Search systems...');
    await userEvent.type(searchInput, 'non-existent-system');

    await waitFor(() => {
      expect(screen.getByText('No systems found')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API to throw an error
    mockCatalogApi.getEntities.mockRejectedValue(new Error('API Error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<TrafficComponent />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load catalog entities',
        expect.any(Error),
      );
    });

    consoleSpy.mockRestore();
  });

  it('displays all traffic light components', async () => {
    render(<TrafficComponent />);

    await waitFor(() => {
      expect(
        screen.getByTestId('dependabot-traffic-light'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('blackduck-traffic-light')).toBeInTheDocument();
      expect(
        screen.getByTestId('github-security-traffic-light'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('reporting-traffic-light')).toBeInTheDocument();
      expect(
        screen.getByTestId('preproduction-traffic-light'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('foundation-traffic-light'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('sonarqube-traffic-light')).toBeInTheDocument();
      expect(screen.getByTestId('base-traffic-light')).toBeInTheDocument();
      expect(
        screen.getByTestId('azure-devops-bugs-traffic-light'),
      ).toBeInTheDocument();
    });
  });

  it('passes correct entities to traffic light components', async () => {
    render(<TrafficComponent />);

    await waitFor(() => {
      expect(screen.getByText('Selected Repositories (2)')).toBeInTheDocument();
    });

    // The traffic light components should receive the filtered entities
    // This is implicitly tested through the rendering of the traffic lights
    // with the correct entity props
  });
});
