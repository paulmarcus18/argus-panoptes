import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { techInsightsFactRetrieversExtensionPoint } from '@backstage-community/plugin-tech-insights-node';
import { createGitHubCommitMessageRetriever } from './githubCommitRetriever';

export const aiPluginModuleTechInsightsBackendModule = createBackendModule({
  pluginId: 'ai-plugin',
  moduleId: 'tech-insights-backend-module',
  register(reg) {
    reg.registerInit({
      deps: {
        providers: techInsightsFactRetrieversExtensionPoint,
        logger: coreServices.rootLogger,
      },
      async init({ providers, logger }) {
        logger.info('✅ Registering GitHub Commit Message Fact Retriever...');
        providers.addFactRetrievers({
          createGitHubCommitMessageRetriever
        });
      },
    });
  },
});
