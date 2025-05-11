import { getVoidLogger } from '@backstage/backend-common';
import { createSonarCloudFactRetriever } from '@internal/plugin-tech-insights-backend-module-traffic-light-backend-module/src/sonarCloud/sonarCloudFactRetriever';
import { ConfigReader } from '@backstage/config';
import { Entity } from '@backstage/catalog-model';
import { UrlReaderService } from '@backstage/backend-plugin-api';

// Mock for CatalogClient
const mockGetEntitiesImpl = jest.fn();
jest.mock('@backstage/catalog-client', () => {
  return {
    CatalogClient: jest.fn().mockImplementation(() => ({
      getEntities: mockGetEntitiesImpl,
    })),
  };
});

// Mock global fetch for SonarCloud API requests
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('SonarCloud Fact Retriever', () => {
  // Setup reusable test variables
  const mockConfig = new ConfigReader({
    sonarcloud: {
      token: 'test-token',
    },
  });
  
  const mockLogger = getVoidLogger();

  // Mock discovery API for service URLs
  const mockDiscovery = {
    getBaseUrl: jest.fn().mockResolvedValue('http://backstage.test/api/catalog'),
    getExternalBaseUrl: jest.fn().mockResolvedValue('http://backstage.test/external'),
  };
  
  // Mock authentication API
  const mockAuth: any = {
    getPluginRequestToken: jest.fn().mockResolvedValue({ token: 'catalog-token' }),
    getOwnServiceCredentials: jest.fn().mockResolvedValue('service-creds'),
    authenticate: jest.fn(),
    isPrincipal: jest.fn().mockImplementation(() => false),
    getNoneCredentials: jest.fn(),
    getLimitedUserToken: jest.fn(),
    listPublicServiceKeys: jest.fn(),
  };
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEntitiesImpl.mockReset();
  });
  
  /**
   * Helper function to create a test entity
   * @param overrides - Partial entity metadata to override defaults
   */
  const createTestEntity = (overrides: any = {}): Entity => {
    const entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'component',
      metadata: {
        name: 'test-component',
        namespace: 'default',
        annotations: {
          'sonarcloud.io/enabled': 'true',
          'sonarcloud.io/project-key': 'test-project',
        },
      },
      spec: {},
    };

    // Handle metadata overrides
    if (overrides.metadata) {
      if (overrides.metadata.name) {
        entity.metadata.name = overrides.metadata.name;
      }
      if (overrides.metadata.namespace) {
        entity.metadata.namespace = overrides.metadata.namespace;
      }
      if (overrides.metadata.annotations) {
        entity.metadata.annotations = {
          ...entity.metadata.annotations,
          ...overrides.metadata.annotations,
        };
      }
    }

    return entity as Entity;
  };

  // Test: Fact retriever is created with correct configuration
  it('should create a fact retriever with correct id and schema', async () => {
    const factRetriever = createSonarCloudFactRetriever(mockConfig, mockLogger);
    
    // Verify the fact retriever is set up correctly
    expect(factRetriever).toEqual(expect.objectContaining({
      id: 'sonarcloud-fact-retriever',
      version: '1.0',
      entityFilter: [{ kind: 'component' }],
      schema: {
        bugs: {
          type: 'integer',
          description: 'Number of bugs detected by SonarCloud',
        },
        code_smells: {
          type: 'integer',
          description: 'Number of code smells detected by SonarCloud',
        },
        vulnerabilities: {
          type: 'integer',
          description: 'Number of vulnerabilities detected',
        },
      },
      handler: expect.any(Function),
    }));
  });

  // Test: Retrieves SonarCloud metrics for enabled components  
  it('should retrieve SonarCloud metrics for enabled components', async () => {
    // Setup test entity
    const testEntity = createTestEntity();
    
    mockGetEntitiesImpl.mockResolvedValue({ items: [testEntity] });
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        component: {
          measures: [
            { metric: 'bugs', value: '10' },
            { metric: 'code_smells', value: '45' },
            { metric: 'vulnerabilities', value: '5' },
          ],
        },
      }),
    });
    
    // Create the fact retriever
    const factRetriever = createSonarCloudFactRetriever(mockConfig, mockLogger);
    
    // Execute the handler
    const result = await factRetriever.handler({
      config: mockConfig,
      logger: mockLogger,
      discovery: mockDiscovery,
      auth: mockAuth,
      entityFilter: [{ kind: 'component' }],
      urlReader: {
        read: jest.fn(),
        readTree: jest.fn(),
        search: jest.fn(),
      } as unknown as UrlReaderService
    });
    
    // Verify the results
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      entity: {
        name: 'test-component',
        namespace: 'default',
        kind: 'component',
      },
      facts: {
        bugs: 10,
        code_smells: 45,
        vulnerabilities: 5,
      },
    });
    
    // Verify that fetch was called with the correct URL and headers
    expect(mockFetch).toHaveBeenCalledWith(
      'https://sonarcloud.io/api/measures/component?component=test-project&metricKeys=bugs,code_smells,vulnerabilities',
      {
        headers: {
          'Authorization': `Basic ${Buffer.from('test-token:').toString('base64')}`,
        },
      }
    );
  });
  
  // Test: Filters out components without SonarCloud enabled
  it('should filter out components that do not have SonarCloud enabled', async () => {
    // Setup mock entities - one enabled, one disabled
    const enabledEntity = createTestEntity();
    const disabledEntity = createTestEntity({
      metadata: {
        name: 'disabled-component',
        annotations: {
          'sonarcloud.io/enabled': 'false',
          'sonarcloud.io/project-key': 'disabled-project',
        },
      },
    });
    
    mockGetEntitiesImpl.mockResolvedValue({ items: [enabledEntity, disabledEntity] });
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        component: {
          measures: [
            { metric: 'bugs', value: '10' },
            { metric: 'code_smells', value: '45' },
            { metric: 'vulnerabilities', value: '5' },
          ],
        },
      }),
    });
    
    // Create the fact retriever
    const factRetriever = createSonarCloudFactRetriever(mockConfig, mockLogger);
    
    // Execute the handler
    const result = await factRetriever.handler({
      config: mockConfig,
      logger: mockLogger,
      discovery: mockDiscovery,
      auth: mockAuth,
      entityFilter: [{ kind: 'component' }],
      urlReader: {
        read: jest.fn(),
        readTree: jest.fn(),
        search: jest.fn(),
      } as unknown as UrlReaderService
    });
    
    // Verify only one result is returned (the enabled entity)
    expect(result).toHaveLength(1);
    expect(result[0].entity.name).toBe('test-component');
    
    // Verify fetch was called only once
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
  
  // Test: Handles missing project key annotation
  it('should handle missing project key annotation', async () => {
    // Setup mock entity with missing project key
    const noKeyEntity = createTestEntity({
      metadata: {
        name: 'no-key-component',
        annotations: {
          'sonarcloud.io/enabled': 'true',
          'sonarcloud.io/project-key': undefined,
        },
      },
    });
    
    mockGetEntitiesImpl.mockResolvedValue({ items: [noKeyEntity] });
    
    // Create the fact retriever
    const factRetriever = createSonarCloudFactRetriever(mockConfig, mockLogger);
    
    // Execute the handler
    const result = await factRetriever.handler({
      config: mockConfig,
      logger: mockLogger,
      discovery: mockDiscovery,
      auth: mockAuth,
      entityFilter: [{ kind: 'component' }],
      urlReader: {
        read: jest.fn(),
        readTree: jest.fn(),
        search: jest.fn(),
      } as unknown as UrlReaderService
    });
    
    // Verify no results are returned
    expect(result).toHaveLength(0);
    
    // Verify fetch was not called
    expect(mockFetch).not.toHaveBeenCalled();
  });
  
  // Test: Handles SonarCloud API failures
  it('should handle SonarCloud API failures', async () => {
    const testEntity = createTestEntity();
    
    mockGetEntitiesImpl.mockResolvedValue({ items: [testEntity] });
    
    // Mock a failed API response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Invalid token',
    });
    
    // Create the fact retriever
    const factRetriever = createSonarCloudFactRetriever(mockConfig, mockLogger);
    
    // Spy on logger.error
    const errorSpy = jest.spyOn(mockLogger, 'error');
    
    // Execute the handler
    const result = await factRetriever.handler({
      config: mockConfig,
      logger: mockLogger,
      discovery: mockDiscovery,
      auth: mockAuth,
      entityFilter: [{ kind: 'component' }],
      urlReader: {
        read: jest.fn(),
        readTree: jest.fn(),
        search: jest.fn(),
      } as unknown as UrlReaderService
    });
    
    // Verify no results are returned
    expect(result).toHaveLength(0);
    
    // Verify error was logged
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('SonarCloud API error for test-project: 401 Unauthorized')
    );
  });
  
  // Test: Handles missing metric values in SonarCloud response
  it('should handle missing metric values in SonarCloud response', async () => {
    const testEntity = createTestEntity();
    
    mockGetEntitiesImpl.mockResolvedValue({ items: [testEntity] });
    
    // Mock a response with missing metrics
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        component: {
          measures: [
            // Only bugs metric, missing code_smells and vulnerabilities
            { metric: 'bugs', value: '7' },
          ],
        },
      }),
    });
    
    // Create the fact retriever
    const factRetriever = createSonarCloudFactRetriever(mockConfig, mockLogger);
    
    // Execute the handler
    const result = await factRetriever.handler({
      config: mockConfig,
      logger: mockLogger,
      discovery: mockDiscovery,
      auth: mockAuth,
      entityFilter: [{ kind: 'component' }],
      urlReader: {
        read: jest.fn(),
        readTree: jest.fn(),
        search: jest.fn(),
      } as unknown as UrlReaderService
    });
    
    // Verify the results - missing metrics should be 0
    expect(result).toHaveLength(1);
    expect(result[0].facts).toEqual({
      bugs: 7,
      code_smells: 0,
      vulnerabilities: 0,
    });
  });
  
  // Test: Handles multiple enabled components and fetches metrics for each
  it('should handle multiple enabled components', async () => {
    // Setup mocks
    const entity1 = createTestEntity();
    const entity2 = createTestEntity({
      metadata: {
        name: 'component-2',
        annotations: {
          'sonarcloud.io/enabled': 'true',
          'sonarcloud.io/project-key': 'project-2',
        },
      },
    });
    
    // Set up mock response directly
    mockGetEntitiesImpl.mockResolvedValue({ items: [entity1, entity2] });
    
    // Mock responses for both projects
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          component: {
            measures: [
              { metric: 'bugs', value: '10' },
              { metric: 'code_smells', value: '45' },
              { metric: 'vulnerabilities', value: '5' },
            ],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          component: {
            measures: [
              { metric: 'bugs', value: '3' },
              { metric: 'code_smells', value: '22' },
              { metric: 'vulnerabilities', value: '1' },
            ],
          },
        }),
      });
    
    // Create the fact retriever
    const factRetriever = createSonarCloudFactRetriever(mockConfig, mockLogger);
    
    // Execute the handler
    const result = await factRetriever.handler({
      config: mockConfig,
      logger: mockLogger,
      discovery: mockDiscovery,
      auth: mockAuth,
      entityFilter: [{ kind: 'component' }],
      urlReader: {
        read: jest.fn(),
        readTree: jest.fn(),
        search: jest.fn(),
      } as unknown as UrlReaderService
    });
    
    // Verify the results for both components
    expect(result).toHaveLength(2);
    
    expect(result[0].entity.name).toBe('test-component');
    expect(result[0].facts).toEqual({
      bugs: 10,
      code_smells: 45,
      vulnerabilities: 5,
    });
    
    expect(result[1].entity.name).toBe('component-2');
    expect(result[1].facts).toEqual({
      bugs: 3,
      code_smells: 22,
      vulnerabilities: 1,
    });
    
    // Verify fetch was called twice with the correct URLs
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'https://sonarcloud.io/api/measures/component?component=test-project&metricKeys=bugs,code_smells,vulnerabilities',
      expect.any(Object)
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://sonarcloud.io/api/measures/component?component=project-2&metricKeys=bugs,code_smells,vulnerabilities',
      expect.any(Object)
    );
  });
});
