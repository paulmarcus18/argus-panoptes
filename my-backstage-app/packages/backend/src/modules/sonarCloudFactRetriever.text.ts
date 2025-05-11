import { createSonarCloudFactRetriever, techInsightsModuleSonarCloudFactRetriever } from '@internal/plugin-tech-insights-backend-module-traffic-light-backend-module/src/sonarQube/sonarCloudFactRetriever';
import { createFactRetrieverBackendModule } from '../factRetrieverUtils';
import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';

// Mock dependencies
jest.mock('../factRetrieverUtils', () => ({
  createFactRetrieverBackendModule: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('sonarCloudFactRetriever', () => {
  // Common test variables
  const mockConfig = {
    getConfig: jest.fn(),
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    getStringArray: jest.fn(),
    has: jest.fn(),
    keys: jest.fn(),
    get: jest.fn(),
    getOptional: jest.fn(),
    getOptionalConfig: jest.fn(),
    getOptionalString: jest.fn(),
    getOptionalStringArray: jest.fn(),
    getOptionalNumber: jest.fn(),
    getOptionalBoolean: jest.fn(),
  };

  const mockSonarConfig = {
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    getStringArray: jest.fn(),
    has: jest.fn(),
    keys: jest.fn(),
    get: jest.fn(),
    getOptional: jest.fn(),
    getOptionalConfig: jest.fn(),
    getOptionalString: jest.fn(),
    getOptionalStringArray: jest.fn(),
    getOptionalNumber: jest.fn(),
    getOptionalBoolean: jest.fn(),
  };

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockToken = 'test-token';
  const mockOrganization = 'test-org';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock config
    mockConfig.getConfig.mockReturnValue(mockSonarConfig);
    mockSonarConfig.getString.mockImplementation((key) => {
      if (key === 'token') return mockToken;
      if (key === 'organization') return mockOrganization;
      return '';
    });

    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  describe('createSonarCloudFactRetriever', () => {
    it('should create a fact retriever with correct id and schema', () => {
      // Act
      const factRetriever = createSonarCloudFactRetriever(
        mockConfig as unknown as Config,
        mockLogger as unknown as LoggerService,
      );

      // Assert
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
          security_hotspots: {
            type: 'integer',
            description: 'Number of security hotspots detected',
          },
        },
        handler: expect.any(Function),
      }));
    });

    describe('fact retriever handler', () => {
      it('should fetch and process SonarCloud metrics correctly', async () => {
        // Arrange
        const mockResponse = {
          component: {
            measures: [
              { metric: 'bugs', value: '10' },
              { metric: 'code_smells', value: '20' },
              { metric: 'security_hotspots', value: '5' },
            ],
          },
        };

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue(mockResponse),
        });

        const factRetriever = createSonarCloudFactRetriever(
          mockConfig as unknown as Config,
          mockLogger as unknown as LoggerService,
        );

        // Act
        const result = await factRetriever.handler({
          config: mockConfig as unknown as Config,
          logger: mockLogger as unknown as LoggerService,
        } as any);

        // Assert
        expect(global.fetch).toHaveBeenCalledWith(
          `https://sonarcloud.io/api/measures/component?component=${mockOrganization}_tabia&metricKeys=bugs,code_smells,security_hotspots`,
          {
            headers: {
              'Authorization': `Basic ${Buffer.from(`${mockToken}:`).toString('base64')}`,
            },
          }
        );

        expect(result).toEqual([
          {
            entity: {
              name: 'tabia',
              namespace: 'default',
              kind: 'component',
            },
            facts: {
              bugs: 10,
              code_smells: 20,
              security_hotspots: 5,
            },
          },
        ]);
      });

      it('should handle missing metrics by defaulting to 0', async () => {
        // Arrange
        const mockResponse = {
          component: {
            measures: [
              { metric: 'bugs', value: '10' },
              // code_smells and security_hotspots are missing
            ],
          },
        };

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue(mockResponse),
        });

        const factRetriever = createSonarCloudFactRetriever(
          mockConfig as unknown as Config,
          mockLogger as unknown as LoggerService,
        );

        // Act
        const result = await factRetriever.handler({
          config: mockConfig as unknown as Config,
          logger: mockLogger as unknown as LoggerService,
        } as any);

        // Assert
        expect(result).toEqual([
          {
            entity: {
              name: 'tabia',
              namespace: 'default',
              kind: 'component',
            },
            facts: {
              bugs: 10,
              code_smells: 0,
              security_hotspots: 0,
            },
          },
        ]);
      });

      it('should handle API errors and return empty array', async () => {
        // Arrange
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: jest.fn().mockResolvedValue('Invalid token'),
        });

        const factRetriever = createSonarCloudFactRetriever(
          mockConfig as unknown as Config,
          mockLogger as unknown as LoggerService,
        );

        // Act
        const result = await factRetriever.handler({
          config: mockConfig as unknown as Config,
          logger: mockLogger as unknown as LoggerService,
        } as any);

        // Assert
        expect(result).toEqual([]);
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('SonarCloud API error: 401 Unauthorized')
        );
      });

      it('should handle fetch exceptions and return empty array', async () => {
        // Arrange
        const error = new Error('Network error');
        (global.fetch as jest.Mock).mockRejectedValue(error);

        const factRetriever = createSonarCloudFactRetriever(
          mockConfig as unknown as Config,
          mockLogger as unknown as LoggerService,
        );

        // Act
        const result = await factRetriever.handler({
          config: mockConfig as unknown as Config,
          logger: mockLogger as unknown as LoggerService,
        } as any);

        // Assert
        expect(result).toEqual([]);
        expect(mockLogger.error).toHaveBeenCalledWith(
          `Failed to fetch SonarCloud metrics: ${error}`
        );
      });
    });
  });

  describe('techInsightsModuleSonarCloudFactRetriever', () => {
    it('should call createFactRetrieverBackendModule with correct parameters', () => {
      // Assert that createFactRetrieverBackendModule was called correctly
      expect(createFactRetrieverBackendModule).toHaveBeenCalledWith({
        pluginId: 'tech-insights',
        moduleId: 'sonarcloud-fact-retriever',
        createFactRetriever: createSonarCloudFactRetriever,
        logMessage: 'Registering SonarCloud fact retriever',
      });
    });
  });
});
