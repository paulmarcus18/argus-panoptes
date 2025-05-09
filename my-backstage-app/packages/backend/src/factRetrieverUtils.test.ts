import { createFactRetrieverBackendModule } from './factRetrieverUtils';
import { coreServices, createBackendModule } from '@backstage/backend-plugin-api';
import { techInsightsFactRetrieversExtensionPoint } from '@backstage-community/plugin-tech-insights-node';
import { Config } from '@backstage/config';

/*
* Testing the behavior of the createFactRetrieverBackendModule function.
*/

// Mocking the createBackendModule function while keeping the rest of the backend-plugin-api intact
// This allows us to test the behavior of the createFactRetrieverBackendModule function
jest.mock('@backstage/backend-plugin-api', () => {
  const actual = jest.requireActual('@backstage/backend-plugin-api');
  return {
    ...actual,
    createBackendModule: jest.fn(),
  };
});

// creating the tests for the factRetrieverUtils
describe('factRetrieverUtils', () => {
  describe('createFactRetrieverBackendModule', () => {
    // Common test variables
    const mockPluginId = 'test-plugin';
    const mockModuleId = 'test-module';
    const mockLogMessage = 'Registering test fact retriever';
    
    // Mock fact retriever
    const mockFactRetriever = {
      id: 'test-fact-retriever',
      name: 'Test Fact Retriever',
      version: '1.0.0',
      schema: {
        testFact: {
          type: 'string',
          description: 'A test fact',
        },
      },
      handler: jest.fn(),
    };
    
    // Mock dependencies
    const mockCreateFactRetriever = jest.fn();
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    const mockConfig = {
      get: jest.fn(),
      getOptional: jest.fn(),
      getConfig: jest.fn(),
      getConfigArray: jest.fn(),
      getNumber: jest.fn(),
      getBoolean: jest.fn(),
      getString: jest.fn(),
      getStringArray: jest.fn(),
      has: jest.fn(),
      keys: jest.fn(),
    };
    const mockFactRetrievers = {
      addFactRetrievers: jest.fn(),
    };

    // This makes sure that each test starts with a clean slate, avoiding any side effects from previous tests
    beforeEach(() => {
      jest.clearAllMocks();
      mockCreateFactRetriever.mockReturnValue(mockFactRetriever);
    });

    /*
    * Test cases for createFactRetrieverBackendModule function
    */
   
    it('should create a backend module with correct parameters', () => {
      // Act
      createFactRetrieverBackendModule({
        pluginId: mockPluginId,
        moduleId: mockModuleId,
        createFactRetriever: mockCreateFactRetriever,
        logMessage: mockLogMessage,
      });

      // Assert
      expect(createBackendModule).toHaveBeenCalledWith({
        pluginId: mockPluginId,
        moduleId: mockModuleId,
        register: expect.any(Function),
      });
    });

    it('should register init with correct dependencies', () => {
      // Act
      createFactRetrieverBackendModule({
        pluginId: mockPluginId,
        moduleId: mockModuleId,
        createFactRetriever: mockCreateFactRetriever,
        logMessage: mockLogMessage,
      });

      // Get the register function
      const registerFn = (createBackendModule as jest.Mock).mock.calls[0][0].register;
      
      // Mock env for register function
      const mockEnv = {
        registerInit: jest.fn(),
      };

      // Call register function
      registerFn(mockEnv);

      // Assert
      expect(mockEnv.registerInit).toHaveBeenCalledWith({
        deps: {
          factRetrievers: techInsightsFactRetrieversExtensionPoint,
          config: coreServices.rootConfig,
          logger: coreServices.rootLogger,
        },
        init: expect.any(Function),
      });
    });

    it('should initialize the fact retriever properly', async () => {
      // Act
      createFactRetrieverBackendModule({
        pluginId: mockPluginId,
        moduleId: mockModuleId,
        createFactRetriever: mockCreateFactRetriever,
        logMessage: mockLogMessage,
      });

      // Get the register function
      const registerFn = (createBackendModule as jest.Mock).mock.calls[0][0].register;
      
      // Mock env for register function
      const mockEnv = {
        registerInit: jest.fn(),
      };

      // Call register function
      registerFn(mockEnv);

      // Get the init function
      const initFn = mockEnv.registerInit.mock.calls[0][0].init;

      // Call init function with dependencies
      await initFn({
        factRetrievers: mockFactRetrievers,
        config: mockConfig as unknown as Config,
        logger: mockLogger,
      });

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(mockLogMessage);
      expect(mockCreateFactRetriever).toHaveBeenCalledWith(mockConfig, mockLogger);
      expect(mockFactRetrievers.addFactRetrievers).toHaveBeenCalledWith({
        [mockFactRetriever.id]: mockFactRetriever,
      });
    });

    it('should handle errors during initialization', async () => {
      // Arrange
      const error = new Error('Test error');
      mockCreateFactRetriever.mockImplementation(() => {
        throw error;
      });

      // Act
      createFactRetrieverBackendModule({
        pluginId: mockPluginId,
        moduleId: mockModuleId,
        createFactRetriever: mockCreateFactRetriever,
        logMessage: mockLogMessage,
      });

      const registerFn = (createBackendModule as jest.Mock).mock.calls[0][0].register;
      const mockEnv = { registerInit: jest.fn() };
      registerFn(mockEnv);
      const initFn = mockEnv.registerInit.mock.calls[0][0].init;

      // Assert - should throw the same error
      await expect(initFn({
        factRetrievers: mockFactRetrievers,
        config: mockConfig as unknown as Config,
        logger: mockLogger,
      })).rejects.toThrow(error);
    });

    it('should create a retriever with the provided config', async () => {
      // Arrange
      const customConfig = {
        ...mockConfig,
        get: jest.fn().mockReturnValue({ special: 'config' }),
      };

      // Act
      createFactRetrieverBackendModule({
        pluginId: mockPluginId,
        moduleId: mockModuleId,
        createFactRetriever: mockCreateFactRetriever,
        logMessage: mockLogMessage,
      });

      const registerFn = (createBackendModule as jest.Mock).mock.calls[0][0].register;
      const mockEnv = { registerInit: jest.fn() };
      registerFn(mockEnv);
      const initFn = mockEnv.registerInit.mock.calls[0][0].init;

      await initFn({
        factRetrievers: mockFactRetrievers,
        config: customConfig as unknown as Config,
        logger: mockLogger,
      });

      // Assert
      expect(mockCreateFactRetriever).toHaveBeenCalledWith(customConfig, mockLogger);
    });

    it('should use default values when options are partially provided', () => {
      // Test with partial options
      const partialOptions = {
        pluginId: mockPluginId,
        createFactRetriever: mockCreateFactRetriever,
      };

      // @ts-expect-error - Testing with incomplete options
      createFactRetrieverBackendModule(partialOptions);

      // The function should still call createBackendModule
      expect(createBackendModule).toHaveBeenCalled();
    });
  });
});