import { Entity } from '@backstage/catalog-model';
import { FactRetrieverContext } from '@backstage-community/plugin-tech-insights-node';
import { githubAdvancedSecurityFactRetriever } from './githubASFactRetriever'; // Adjust import path

// Set up mocks before imports
// Mock the request method
const mockRequest = jest.fn();

// Mock the Octokit class - this is much simpler for static imports
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn(() => ({
    request: mockRequest
  }))
}));

// Mock catalog client
jest.mock('@backstage/catalog-client');
import { CatalogClient } from '@backstage/catalog-client';

// Create mock class for CatalogClient
const MockedCatalogClient = CatalogClient as jest.MockedClass<typeof CatalogClient>;

describe('githubAdvancedSecurityFactRetriever', () => {
  let mockConfig: any;
  let mockLogger: any;
  let mockAuth: any;
  let mockDiscovery: any;
  let mockUrlReader: any;
  let mockCatalogClient: any;
  let mockContext: FactRetrieverContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.mockReset();

    // Mock config
    mockConfig = {
      getOptionalConfigArray: jest.fn(),
    };

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Mock auth
    mockAuth = {
      getPluginRequestToken: jest.fn(),
      getOwnServiceCredentials: jest.fn(),
    };

    // Mock discovery
    mockDiscovery = {
      getBaseUrl: jest.fn(),
    };

    // Mock urlReader
    mockUrlReader = {
      readUrl: jest.fn(),
      readTree: jest.fn(),
      search: jest.fn(),
    };

    // Mock CatalogClient instance
    mockCatalogClient = {
      getEntities: jest.fn().mockResolvedValue({ items: [] }),
    };

    MockedCatalogClient.mockImplementation(() => mockCatalogClient);

    // Create complete context object - using the correct array format for entityFilter
    mockContext = {
      config: mockConfig,
      logger: mockLogger,
      entityFilter: [{ kind: 'component' }],
      auth: mockAuth,
      discovery: mockDiscovery,
      urlReader: mockUrlReader,
    };

    // Default successful setup
    mockConfig.getOptionalConfigArray.mockReturnValue([
      {
        getOptionalString: jest.fn().mockReturnValue('github-token'),
      },
    ]);

    mockAuth.getOwnServiceCredentials.mockResolvedValue({});
    mockAuth.getPluginRequestToken.mockResolvedValue({
      token: 'catalog-token',
    });
  });

  describe('Basic Configuration', () => {
    it('should have correct id and version', () => {
      expect(githubAdvancedSecurityFactRetriever.id).toBe('githubAdvancedSecurityFactRetriever');
      expect(githubAdvancedSecurityFactRetriever.version).toBe('0.2.0');
    });

    it('should filter for component entities', () => {
      expect(githubAdvancedSecurityFactRetriever.entityFilter).toEqual([{ kind: 'component' }]);
    });

    it('should have correct schema', () => {
      const schema = githubAdvancedSecurityFactRetriever.schema;
      expect(schema.openCodeScanningAlertCount).toBeDefined();
      expect(schema.openSecretScanningAlertCount).toBeDefined();
      expect(schema.secretScanningAlerts).toBeDefined();
      expect(schema.codeScanningAlerts).toBeDefined();
    });
  });

  // Test cases for the handler function
  describe('Handler Function', () => {
    it('should handle missing GitHub token', async () => {
      mockConfig.getOptionalConfigArray.mockReturnValue([
        {
          getOptionalString: jest.fn().mockReturnValue(undefined),
        },
      ]);

      const result = await githubAdvancedSecurityFactRetriever.handler(mockContext);

      expect(result).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith('Retrieved GitHub token: Missing');
    });

    it('should handle config error', async () => {
      mockConfig.getOptionalConfigArray.mockImplementation(() => {
        throw new Error('Config error');
      });

      const result = await githubAdvancedSecurityFactRetriever.handler(mockContext);

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Could not retrieve GitHub token:')
      );
    });

    it('should process entities with GitHub integration successfully', async () => {
      const mockEntities: Entity[] = [
        {
          apiVersion: 'v1',
          kind: 'Component',
          metadata: {
            name: 'test-component',
            namespace: 'default',
            annotations: {
              'github.com/project-slug': 'owner/repo',
            },
          },
          spec: {},
        },
      ];

      mockCatalogClient.getEntities.mockResolvedValue({
        items: mockEntities,
      });

      // Mock GitHub API responses in sequence
      mockRequest
        // Code scanning response
        .mockResolvedValueOnce({
          data: [
            {
              number: 1,
              rule: {
                security_severity_level: 'high',
                description: 'SQL injection vulnerability',
                name: 'sql-injection',
              },
              created_at: '2023-01-01T00:00:00Z',
              most_recent_instance: {
                commit_sha: 'abc123',
                location: {
                  path: 'src/main.js',
                  start_line: 42,
                },
              },
            },
          ],
        })
        // Secret scanning response
        .mockResolvedValueOnce({
          data: [
            {
              number: 1,
              secret_type: 'github_token',
              created_at: '2023-01-01T00:00:00Z',
              html_url: 'https://github.com/owner/repo/security/secret-scanning/1',
            },
          ],
        });

      const result = await githubAdvancedSecurityFactRetriever.handler(mockContext);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        entity: {
          kind: 'Component',
          namespace: 'default',
          name: 'test-component',
        },
        facts: {
          openCodeScanningAlertCount: 1,
          openSecretScanningAlertCount: 1,
          codeScanningAlerts: {
            'code-1': {
              severity: 'high',
              description: 'SQL injection vulnerability',
              created_at: '2023-01-01T00:00:00Z',
              direct_link: 'https://github.com/owner/repo/blob/abc123/src/main.js#L42',
            },
          },
          secretScanningAlerts: {
            'secret-1': {
              severity: 'high',
              description: 'Secret of type github_token found',
              created_at: '2023-01-01T00:00:00Z',
              direct_link: 'https://github.com/owner/repo/security/secret-scanning/1',
            },
          },
        },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'GitHub security metrics for owner/repo: Code Scanning: 1, Secret Scanning: 1'
      );
    });

    it('should filter out entities without GitHub annotations', async () => {
      const mockEntities: Entity[] = [
        {
          apiVersion: 'v1',
          kind: 'Component',
          metadata: {
            name: 'test-component-1',
            annotations: {
              'github.com/project-slug': 'owner/repo',
            },
          },
          spec: {},
        },
        {
          apiVersion: 'v1',
          kind: 'Component',
          metadata: {
            name: 'test-component-2',
            // No GitHub annotation
          },
          spec: {},
        },
      ];

      mockCatalogClient.getEntities.mockResolvedValue({
        items: mockEntities,
      });

      mockRequest
        .mockResolvedValueOnce({ data: [] }) // Code scanning
        .mockResolvedValueOnce({ data: [] }); // Secret scanning

      const result = await githubAdvancedSecurityFactRetriever.handler(mockContext);

      expect(result).toHaveLength(1);
      expect(result[0].entity.name).toBe('test-component-1');
    });

    it('should handle invalid project slug', async () => {
      const mockEntities: Entity[] = [
        {
          apiVersion: 'v1',
          kind: 'Component',
          metadata: {
            name: 'test-component',
            annotations: {
              'github.com/project-slug': 'invalid-slug',
            },
          },
          spec: {},
        },
      ];

      mockCatalogClient.getEntities.mockResolvedValue({
        items: mockEntities,
      });

      const result = await githubAdvancedSecurityFactRetriever.handler(mockContext);

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid GitHub project slug for entity test-component: invalid-slug'
      );
    });

    it('should handle 403 error gracefully', async () => {
      const mockEntities: Entity[] = [
        {
          apiVersion: 'v1',
          kind: 'Component',
          metadata: {
            name: 'test-component',
            annotations: {
              'github.com/project-slug': 'owner/repo',
            },
          },
          spec: {},
        },
      ];

      mockCatalogClient.getEntities.mockResolvedValue({
        items: mockEntities,
      });

      const error = new Error('Forbidden');
      (error as any).status = 403;
      mockRequest.mockRejectedValue(error);

      const result = await githubAdvancedSecurityFactRetriever.handler(mockContext);

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Access denied to security data for owner/repo (status 403) — skipping'
      );
    });

    it('should handle 404 error gracefully', async () => {
      const mockEntities: Entity[] = [
        {
          apiVersion: 'v1',
          kind: 'Component',
          metadata: {
            name: 'test-component',
            annotations: {
              'github.com/project-slug': 'owner/repo',
            },
          },
          spec: {},
        },
      ];

      mockCatalogClient.getEntities.mockResolvedValue({
        items: mockEntities,
      });

      const error = new Error('Not Found');
      (error as any).status = 404;
      mockRequest.mockRejectedValue(error);

      const result = await githubAdvancedSecurityFactRetriever.handler(mockContext);

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Access denied to security data for owner/repo (status 404) — skipping'
      );
    });

    it('should handle other API errors', async () => {
      const mockEntities: Entity[] = [
        {
          apiVersion: 'v1',
          kind: 'Component',
          metadata: {
            name: 'test-component',
            annotations: {
              'github.com/project-slug': 'owner/repo',
            },
          },
          spec: {},
        },
      ];

      mockCatalogClient.getEntities.mockResolvedValue({
        items: mockEntities,
      });

      const error = new Error('Internal Server Error');
      (error as any).status = 500;
      mockRequest.mockRejectedValue(error);

      const result = await githubAdvancedSecurityFactRetriever.handler(mockContext);

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching security data for owner/repo: Internal Server Error (status 500)'
      );
    });

    it('should handle missing rule information in code scanning alerts', async () => {
      const mockEntities: Entity[] = [
        {
          apiVersion: 'v1',
          kind: 'Component',
          metadata: {
            name: 'test-component',
            annotations: {
              'github.com/project-slug': 'owner/repo',
            },
          },
          spec: {},
        },
      ];

      mockCatalogClient.getEntities.mockResolvedValue({
        items: mockEntities,
      });

      mockRequest
        // Code scanning response with missing rule info
        .mockResolvedValueOnce({
          data: [
            {
              number: 1,
              rule: null, // Missing rule
              created_at: '2023-01-01T00:00:00Z',
              most_recent_instance: {
                commit_sha: 'abc123',
                location: {
                  path: 'src/main.js',
                  // Missing start_line
                },
              },
            },
          ],
        })
        // Secret scanning response
        .mockResolvedValueOnce({
          data: [],
        });

      const result = await githubAdvancedSecurityFactRetriever.handler(mockContext);

      expect(result).toHaveLength(1);
      expect(result[0].facts.codeScanningAlerts).toEqual({
        'code-1': {
          severity: 'unknown',
          description: 'No description available',
          created_at: '2023-01-01T00:00:00Z',
          direct_link: 'https://github.com/owner/repo/blob/abc123/src/main.js#L1',
        },
      });
    });

    it('should handle missing secret type in secret scanning alerts', async () => {
      const mockEntities: Entity[] = [
        {
          apiVersion: 'v1',
          kind: 'Component',
          metadata: {
            name: 'test-component',
            annotations: {
              'github.com/project-slug': 'owner/repo',
            },
          },
          spec: {},
        },
      ];

      mockCatalogClient.getEntities.mockResolvedValue({
        items: mockEntities,
      });

      mockRequest
        // Code scanning response
        .mockResolvedValueOnce({
          data: [],
        })
        // Secret scanning response with missing info
        .mockResolvedValueOnce({
          data: [
            {
              number: 1,
              // Missing secret_type
              created_at: '2023-01-01T00:00:00Z',
              // Missing html_url
            },
          ],
        });

      const result = await githubAdvancedSecurityFactRetriever.handler(mockContext);

      expect(result).toHaveLength(1);
      expect(result[0].facts.secretScanningAlerts).toEqual({
        'secret-1': {
          severity: 'high',
          description: 'Secret of type unknown found',
          created_at: '2023-01-01T00:00:00Z',
          direct_link: '',
        },
      });
    });

    it('should process multiple entities correctly', async () => {
      const mockEntities: Entity[] = [
        {
          apiVersion: 'v1',
          kind: 'Component',
          metadata: {
            name: 'test-component-1',
            annotations: {
              'github.com/project-slug': 'owner/repo1',
            },
          },
          spec: {},
        },
        {
          apiVersion: 'v1',
          kind: 'Component',
          metadata: {
            name: 'test-component-2',
            annotations: {
              'github.com/project-slug': 'owner/repo2',
            },
          },
          spec: {},
        },
      ];

      mockCatalogClient.getEntities.mockResolvedValue({
        items: mockEntities,
      });

      mockRequest
        .mockResolvedValueOnce({ data: [] }) // repo1 code scanning
        .mockResolvedValueOnce({ data: [] }) // repo1 secret scanning
        .mockResolvedValueOnce({ data: [] }) // repo2 code scanning
        .mockResolvedValueOnce({ data: [] }); // repo2 secret scanning

      const result = await githubAdvancedSecurityFactRetriever.handler(mockContext);

      expect(result).toHaveLength(2);
      expect(result[0].entity.name).toBe('test-component-1');
      expect(result[1].entity.name).toBe('test-component-2');
    });

    it('should handle entity with custom namespace', async () => {
      const mockEntities: Entity[] = [
        {
          apiVersion: 'v1',
          kind: 'Component',
          metadata: {
            name: 'test-component',
            namespace: 'custom-namespace',
            annotations: {
              'github.com/project-slug': 'owner/repo',
            },
          },
          spec: {},
        },
      ];

      mockCatalogClient.getEntities.mockResolvedValue({
        items: mockEntities,
      });

      mockRequest
        .mockResolvedValueOnce({ data: [] }) // Code scanning
        .mockResolvedValueOnce({ data: [] }); // Secret scanning

      const result = await githubAdvancedSecurityFactRetriever.handler(mockContext);

      expect(result).toHaveLength(1);
      expect(result[0].entity).toEqual({
        kind: 'Component',
        namespace: 'custom-namespace',
        name: 'test-component',
      });
    });
  });
});