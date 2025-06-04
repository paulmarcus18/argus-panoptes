import { reportingPipelineStatusFactRetriever } from '../reportingFactRetriever';
import { CatalogClient } from '@backstage/catalog-client';
import { Logger } from 'winston';
import { Config } from '@backstage/config';
import {
  AuthService,
  DiscoveryService,
  UrlReaderService,
} from '@backstage/backend-plugin-api';

jest.mock('@backstage/catalog-client');

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockLogger: Logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as any;

const createMockConfig = (token?: string): Config =>
  ({
    getOptionalConfigArray: jest.fn((path: string) => {
      if (path === 'integrations.github' && token) {
        return [
          {
            getOptionalString: jest.fn((key: string) => {
              if (key === 'token') return token;
              return undefined;
            }),
          },
        ];
      }
      return undefined;
    }),
  } as any);

// Complete mock auth service
const mockAuth: AuthService = {
  getPluginRequestToken: jest
    .fn()
    .mockResolvedValue({ token: 'catalog-token' }),
  getOwnServiceCredentials: jest.fn().mockResolvedValue({}),
  authenticate: jest.fn().mockResolvedValue({ principal: { type: 'service' } }),
  getNoneCredentials: jest
    .fn()
    .mockReturnValue({ principal: { type: 'none' } }),
  getLimitedUserToken: jest
    .fn()
    .mockResolvedValue({ token: 'limited-user-token' }),
  listPublicServiceKeys: jest.fn().mockResolvedValue({ keys: [] }),
  isPrincipal: jest.fn().mockReturnValue(true) as any,
};

const mockDiscovery: DiscoveryService = {
  getBaseUrl: jest.fn().mockResolvedValue('http://localhost:7007'),
  getExternalBaseUrl: jest.fn().mockResolvedValue('http://localhost:7007'),
};

// Mock URL reader service
const mockUrlReader: UrlReaderService = {
  readUrl: jest.fn().mockResolvedValue({
    buffer: jest.fn().mockResolvedValue(Buffer.from('mock content')),
    stream: jest.fn().mockReturnValue({} as any),
    etag: 'mock-etag',
  }),
  readTree: jest.fn().mockResolvedValue({
    files: jest.fn().mockResolvedValue([]),
    archive: jest.fn().mockResolvedValue(Buffer.from('mock archive')),
    dir: jest.fn().mockResolvedValue('/mock/dir'),
    etag: 'mock-etag',
  }),
  search: jest.fn().mockResolvedValue({
    files: [],
    etag: 'mock-etag',
  }),
};

const sampleEntities = [
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'test-service',
      namespace: 'default',
      annotations: {
        'github.com/project-slug': 'owner/repo1',
        'reporting/workflows': '["CI", "Deploy"]',
      },
    },
    spec: {},
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'service-without-github',
      namespace: 'default',
    },
    spec: {},
  },
];

const sampleWorkflowDefinitions = {
  workflows: [
    { id: 1, name: 'CI', path: '.github/workflows/ci.yml' },
    { id: 2, name: 'Deploy', path: '.github/workflows/deploy.yml' },
    { id: 3, name: 'Other', path: '.github/workflows/other.yml' },
  ],
};

const sampleWorkflowRuns = {
  workflow_runs: [
    {
      name: 'CI',
      status: 'completed',
      conclusion: 'success',
      created_at: '2023-01-01T00:00:00Z',
      head_branch: 'main',
      workflow_id: 1,
    },
    {
      name: 'CI',
      status: 'completed',
      conclusion: 'failure',
      created_at: '2023-01-01T01:00:00Z',
      head_branch: 'main',
      workflow_id: 1,
    },
    {
      name: 'Deploy',
      status: 'completed',
      conclusion: 'success',
      created_at: '2023-01-01T02:00:00Z',
      head_branch: 'main',
      workflow_id: 2,
    },
    {
      name: 'Other',
      status: 'completed',
      conclusion: 'success',
      created_at: '2023-01-01T03:00:00Z',
      head_branch: 'main',
      workflow_id: 3,
    },
    // Not main branch, should be ignored
    {
      name: 'CI',
      status: 'completed',
      conclusion: 'success',
      created_at: '2023-01-01T04:00:00Z',
      head_branch: 'feature-branch',
      workflow_id: 1,
    },
  ],
};

describe('reportingPipelineStatusFactRetriever', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (CatalogClient as jest.Mock).mockImplementation(() => ({
      getEntities: jest.fn().mockResolvedValue({ items: sampleEntities }),
    }));
  });

  it('returns empty array if no GitHub token is configured', async () => {
    const config = createMockConfig();
    const facts = await reportingPipelineStatusFactRetriever.handler({
      config,
      logger: mockLogger,
      entityFilter: [{ kind: 'component' }],
      auth: mockAuth,
      discovery: mockDiscovery,
      urlReader: mockUrlReader,
    });
    expect(facts).toEqual([]);
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('returns correct metrics for included reporting workflows', async () => {
    const config = createMockConfig('test-token');

    // Mock fetch for workflow definitions and runs
    mockFetch
      // First call: workflow definitions
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sampleWorkflowDefinitions,
      })
      // Second call: workflow runs
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sampleWorkflowRuns,
        headers: { get: () => null },
      });

    const facts = await reportingPipelineStatusFactRetriever.handler({
      config,
      logger: mockLogger,
      entityFilter: [{ kind: 'component' }],
      auth: mockAuth,
      discovery: mockDiscovery,
      urlReader: mockUrlReader,
    });

    expect(facts.length).toBe(1);
    const fact = facts[0];
    expect(fact.entity.name).toBe('test-service');
    expect(fact.facts.workflowMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ workflowName: 'CI', totalRuns: 2, successfulRuns: 1 }),
        expect.objectContaining({ workflowName: 'Deploy', totalRuns: 1, successfulRuns: 1 }),
      ])
    );
    expect(fact.facts.totalIncludedWorkflows).toBe(2);
    expect(typeof fact.facts.overallSuccessRate).toBe('number');
  });

  it('handles invalid reporting/workflows annotation gracefully', async () => {
    const config = createMockConfig('test-token');
    const invalidEntities = [
      {
        ...sampleEntities[0],
        metadata: {
          ...sampleEntities[0].metadata,
          annotations: {
            ...sampleEntities[0].metadata.annotations,
            'reporting/workflows': 'not-a-json',
          },
        },
      },
    ];
    (CatalogClient as jest.Mock).mockImplementation(() => ({
      getEntities: jest.fn().mockResolvedValue({ items: invalidEntities }),
    }));

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sampleWorkflowDefinitions,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sampleWorkflowRuns,
        headers: { get: () => null },
      });

    const facts = await reportingPipelineStatusFactRetriever.handler({
      config,
      logger: mockLogger,
      entityFilter: [{ kind: 'component' }],
      auth: mockAuth,
      discovery: mockDiscovery,
      urlReader: mockUrlReader,
    });

    expect(facts.length).toBe(1);
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('returns empty array if fetch fails', async () => {
    const config = createMockConfig('test-token');
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const facts = await reportingPipelineStatusFactRetriever.handler({
      config,
      logger: mockLogger,
      entityFilter: [{ kind: 'component' }],
      auth: mockAuth,
      discovery: mockDiscovery,
      urlReader: mockUrlReader
    });

    expect(facts.length).toBe(0);
    expect(mockLogger.error).toHaveBeenCalled();
  });

  // ...existing code...

  it('returns empty array if no entities have github.com/project-slug annotation', async () => {
    (CatalogClient as jest.Mock).mockImplementation(() => ({
      getEntities: jest.fn().mockResolvedValue({ items: [sampleEntities[1]] }),
    }));

    const config = createMockConfig('test-token');
    const facts = await reportingPipelineStatusFactRetriever.handler({
      config,
      logger: mockLogger,
      entityFilter: [{ kind: 'component' }],
      auth: mockAuth,
      discovery: mockDiscovery,
      urlReader: mockUrlReader,
    });

    expect(facts).toEqual([]);
    expect(mockLogger.info).toHaveBeenCalledWith('Processing 0 GitHub entities for reporting pipelines');
  });

  it('returns empty array if workflow definitions fetch fails', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
        json: async () => ({}),
      });

    const config = createMockConfig('test-token');
    const facts = await reportingPipelineStatusFactRetriever.handler({
      config,
      logger: mockLogger,
      entityFilter: [{ kind: 'component' }],
      auth: mockAuth,
      discovery: mockDiscovery,
      urlReader: mockUrlReader,
    });

    expect(facts.length).toBe(0);
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch workflow definitions'));
  });

  it('returns empty array if workflow runs fetch fails', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sampleWorkflowDefinitions,
      })
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden',
        json: async () => ({}),
        headers: { get: () => null },
      });

    const config = createMockConfig('test-token');
    const facts = await reportingPipelineStatusFactRetriever.handler({
      config,
      logger: mockLogger,
      entityFilter: [{ kind: 'component' }],
      auth: mockAuth,
      discovery: mockDiscovery,
      urlReader: mockUrlReader,
    });

    expect(facts.length).toBe(1);
    const metrics = Array.isArray(facts[0].facts.workflowMetrics) ? facts[0].facts.workflowMetrics : [];
    expect(metrics.length).toBe(0);
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch data for repo1'));
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch data for repo1'));
  });

  it('uses all workflows if reporting/workflows annotation is empty', async () => {
    const entityWithEmptyAnnotation = {
      ...sampleEntities[0],
      metadata: {
        ...sampleEntities[0].metadata,
        annotations: {
          ...sampleEntities[0].metadata.annotations,
          'reporting/workflows': '[]',
        },
      },
    };
    (CatalogClient as jest.Mock).mockImplementation(() => ({
      getEntities: jest.fn().mockResolvedValue({ items: [entityWithEmptyAnnotation] }),
    }));

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sampleWorkflowDefinitions,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sampleWorkflowRuns,
        headers: { get: () => null },
      });

    const config = createMockConfig('test-token');
    const facts = await reportingPipelineStatusFactRetriever.handler({
      config,
      logger: mockLogger,
      entityFilter: [{ kind: 'component' }],
      auth: mockAuth,
      discovery: mockDiscovery,
      urlReader: mockUrlReader,
    });

    // Should include all workflows in metrics
    expect(facts.length).toBe(1);
    expect(facts[0].facts.totalIncludedWorkflows).toBe(sampleWorkflowDefinitions.workflows.length);
  });

  it('uses all workflows if reporting/workflows annotation names do not match any workflow', async () => {
    const entityWithNonMatchingAnnotation = {
      ...sampleEntities[0],
      metadata: {
        ...sampleEntities[0].metadata,
        annotations: {
          ...sampleEntities[0].metadata.annotations,
          'reporting/workflows': '["NonExistentWorkflow"]',
        },
      },
    };
    (CatalogClient as jest.Mock).mockImplementation(() => ({
      getEntities: jest.fn().mockResolvedValue({ items: [entityWithNonMatchingAnnotation] }),
    }));

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sampleWorkflowDefinitions,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sampleWorkflowRuns,
        headers: { get: () => null },
      });

    const config = createMockConfig('test-token');
    const facts = await reportingPipelineStatusFactRetriever.handler({
      config,
      logger: mockLogger,
      entityFilter: [{ kind: 'component' }],
      auth: mockAuth,
      discovery: mockDiscovery,
      urlReader: mockUrlReader,
    });

    // Should fallback to all workflows
    expect(facts.length).toBe(1);
    expect(facts[0].facts.totalIncludedWorkflows).toBe(sampleWorkflowDefinitions.workflows.length);
  });

  it('calculates 0% success rate if there are no successful runs', async () => {
    const failedRuns = {
      workflow_runs: [
        {
          name: 'CI',
          status: 'completed',
          conclusion: 'failure',
          created_at: '2023-01-01T00:00:00Z',
          head_branch: 'main',
          workflow_id: 1,
        },
      ],
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sampleWorkflowDefinitions,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => failedRuns,
        headers: { get: () => null },
      });

    const config = createMockConfig('test-token');
    const facts = await reportingPipelineStatusFactRetriever.handler({
      config,
      logger: mockLogger,
      entityFilter: [{ kind: 'component' }],
      auth: mockAuth,
      discovery: mockDiscovery,
      urlReader: mockUrlReader,
    });

    expect(facts.length).toBe(1);
    const metrics = (facts[0].facts as any).workflowMetrics;
    expect(metrics && metrics[0] && metrics[0].successRate).toBe(0);
    expect((facts[0].facts as any).overallSuccessRate).toBe(0);
  });

  it('rounds success rates to two decimal places', async () => {
    const runs = {
      workflow_runs: [
        {
          name: 'CI',
          status: 'completed',
          conclusion: 'success',
          created_at: '2023-01-01T00:00:00Z',
          head_branch: 'main',
          workflow_id: 1,
        },
        {
          name: 'CI',
          status: 'completed',
          conclusion: 'failure',
          created_at: '2023-01-01T01:00:00Z',
          head_branch: 'main',
          workflow_id: 1,
        },
        {
          name: 'CI',
          status: 'completed',
          conclusion: 'success',
          created_at: '2023-01-01T02:00:00Z',
          head_branch: 'main',
          workflow_id: 1,
        },
      ],
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sampleWorkflowDefinitions,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => runs,
        headers: { get: () => null },
      });

    const config = createMockConfig('test-token');
    const facts = await reportingPipelineStatusFactRetriever.handler({
      config,
      logger: mockLogger,
      entityFilter: [{ kind: 'component' }],
      auth: mockAuth,
      discovery: mockDiscovery,
      urlReader: mockUrlReader,
    });

    expect(facts.length).toBe(1);
    // 2/3 = 66.666... should round to 66.67
    const metrics = (facts[0].facts as any).workflowMetrics;
    expect(metrics && metrics[0] && metrics[0].successRate).toBe(66.67);
    expect((facts[0].facts as any).overallSuccessRate).toBe(66.67);
  });

});