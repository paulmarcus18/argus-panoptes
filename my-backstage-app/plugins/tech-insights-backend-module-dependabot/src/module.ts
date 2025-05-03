import { createBackendModule } from '@backstage/backend-plugin-api';
import { techInsightsFactRetrieversExtensionPoint } from '@backstage-community/plugin-tech-insights-node';
import { dependabotFactRetriever } from './dependabotFactRetriever';

export default createBackendModule({
  pluginId: 'tech-insights',
  moduleId: 'dependabot-facts',
  register(env) {
    env.registerInit({
      deps: {
        providers: techInsightsFactRetrieversExtensionPoint,
      },
      async init({ providers }) {
        console.log('Registering dependabot-facts module...');
        providers.addFactRetrievers({
          dependabotFactRetriever,
        });
      },
    });
  },
});
