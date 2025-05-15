/**
 * This file registers a backend module with the tech-insights plugin
 * Adds a custom fact retriever to the system, dependabotFactRetriever
 * Allows the plugin to collect dependabot alerts for usage
 */

//imports the utility function used to define and create a backend module in Backstage
import { createBackendModule, coreServices, LoggerService } from '@backstage/backend-plugin-api';
//imports the tech insights extension point that lets you plug in custom FactRetrievers
import { techInsightsFactRetrieversExtensionPoint, techInsightsFactCheckerFactoryExtensionPoint } from '@backstage-community/plugin-tech-insights-node';
//imports retriever that queries dependabot alert data
import { dependabotFactRetriever } from './dependabot/dependabotFactRetriever';
import { githubAdvancedSecurityFactRetriever } from './github-advanced-security/githubASFactRetriever';
import { createGitHubSecretScanningCheck } from './github-advanced-security/githubASFactChecker';
// Import JsonRulesEngineFactCheckerFactory
import { JsonRulesEngineFactCheckerFactory } from '@backstage/plugin-tech-insights-backend-module-jsonfc';


//defines a backend module that integrates with the tech insights plugin
export default createBackendModule({
  //specifies which plugin this module is part of.
  pluginId: 'tech-insights',
  //unique identifier for this module within the plugin
  moduleId: 'traffic-lights-backend-module',
  //the 'register' function allows the module to register itself during app startup
  register(env) {
    //registers an initialization routine for this module
    env.registerInit({
      //declares dependencies required by the init function
      deps: {
        //declares that it needs access to the fact retriever provider interface
        providers: techInsightsFactRetrieversExtensionPoint,
        logger: coreServices.rootLogger,
        factCheckerProvider: techInsightsFactCheckerFactoryExtensionPoint,
        config: coreServices.rootConfig,
      },

      //initialization function that will run during backend's startup
      async init({ providers, logger, config, factCheckerProvider }) {
        //logs to the console to confirm module is being registered
        logger.info('Registering dependabot-facts module...');
        providers.addFactRetrievers({
          dependabotFactRetriever,
          githubAdvancedSecurityFactRetriever,
        });


      // Create the fact checkers from config
      const secretCheck = createGitHubSecretScanningCheck(config);
      // Create the JSON Rules Engine factory with our checks
      const jsonRulesEngineFactChecker = new JsonRulesEngineFactCheckerFactory({
        checks: [
          secretCheck,
        ],
        logger,
      });
      
      // Register the fact checker factory
      factCheckerProvider.setFactCheckerFactory(jsonRulesEngineFactChecker);
      },

      
    });
  },
});