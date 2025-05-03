import {
    createBackendModule,
  } from '@backstage/backend-plugin-api';
  import { techInsightsFactRetrieversExtensionPoint } from '@backstage-community/plugin-tech-insights-node';
  import { dependabotFactRetriever } from './dependabotFactRetriever';
  
  export const techInsightsModuleDependabot = createBackendModule({
    pluginId: 'tech-insights',
    moduleId: 'dependabot-facts',
    register(reg) {
      reg.registerInit({
        deps: {
          providers: techInsightsFactRetrieversExtensionPoint,
        },
        async init({ providers }) {
          providers.addFactRetrievers({ dependabotFactRetriever });
        },
      });
    },
  });
  