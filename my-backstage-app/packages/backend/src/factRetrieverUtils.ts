import { 
  coreServices, 
  createBackendModule, 
  LoggerService 
} from '@backstage/backend-plugin-api';
import { 
  FactRetriever,
  techInsightsFactRetrieversExtensionPoint 
} from '@backstage-community/plugin-tech-insights-node';
import { Config } from '@backstage/config/index';

/**
 * Interface for creating a fact retriever backend module
 */
export interface FactRetrieverModuleOptions {
  pluginId: string;
  moduleId: string;
  createFactRetriever: (config: Config, logger: LoggerService) => FactRetriever;
  logMessage: string;
}

/**
 * Create a backend module for a fact retriever
 */
export const createFactRetrieverBackendModule = (options: FactRetrieverModuleOptions) => {
  const { pluginId, moduleId, createFactRetriever, logMessage } = options;
  
  return createBackendModule({
    pluginId,
    moduleId,
    register(env) {
      env.registerInit({
        deps: {
          factRetrievers: techInsightsFactRetrieversExtensionPoint,
          config: coreServices.rootConfig,
          logger: coreServices.rootLogger,
        },
        async init({ factRetrievers, config, logger }) {
          logger.info(logMessage);
          const factRetriever = createFactRetriever(config, logger);
          factRetrievers.addFactRetrievers({ [factRetriever.id]: factRetriever });
        },
      });
    },
  });
};