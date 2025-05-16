/**
 * This file registers a backend module with the tech-insights plugin.
 * Adds two custom fact retrievers to the system, dependabotFactRetriever and sonarCloudFactRetriever.
 * Allows the plugin to collect Dependabot and SonarQube (SonarCloud) alerts for usage.
 */

// Imports the utility function used to define and create a backend module in Backstage.
import { createBackendModule, coreServices, LoggerService } from '@backstage/backend-plugin-api';
// Imports the tech insights extension point that lets you plug in custom FactRetrievers.
import { techInsightsFactRetrieversExtensionPoint, techInsightsFactCheckerFactoryExtensionPoint} from '@backstage-community/plugin-tech-insights-node';
// Imports retriever that queries Dependabot alert data.
import { dependabotFactRetriever } from './dependabot/dependabotFactRetriever';
import { githubAdvancedSecurityFactRetriever } from './github-advanced-security/githubASFactRetriever';
// Imports retriever that queries SonarCloud data.
import { createSonarCloudFactRetriever } from './sonarCloud/sonarCloudFactRetriever';
// Import SonarCloud fact checkers
import { 
  createBugsCheck, 
  createCodeSmellsCheck, 
  createVulnerabilitiesCheck, 
  createQualityGateCheck, 
  createCodeCoverageCheck 
} from './sonarCloud/sonarCloudFactCheckers';
// Import JsonRulesEngineFactCheckerFactory
import { JsonRulesEngineFactCheckerFactory } from '@backstage/plugin-tech-insights-backend-module-jsonfc';


// Defines a backend module that integrates with the tech insights plugin.
export default createBackendModule({
  // Specifies which plugin this module is part of.
  pluginId: 'tech-insights',
  // Unique identifier for this module within the plugin.
  moduleId: 'traffic-lights-backend-module',
  // The 'register' function allows the module to register itself during app startup.
  register(env) {
    // Registers an initialization routine for this module.
    env.registerInit({
      // Declares dependencies required by the init function.
      deps: {
        // Declares that it needs access to the fact retriever provider interface.
        providers: techInsightsFactRetrieversExtensionPoint,
        factCheckerProvider: techInsightsFactCheckerFactoryExtensionPoint,
        logger: coreServices.rootLogger,
        config: coreServices.rootConfig,
      },
      // Initialization function that will run during backend's startup.
      async init({ providers, factCheckerProvider, logger, config }) {
        // Logs to the console to confirm module is being registered.
        logger.info('Registering dependabot-facts module...');
        const sonarCloudFactRetriever = createSonarCloudFactRetriever(config, logger);
        providers.addFactRetrievers({
          githubAdvancedSecurityFactRetriever,
          dependabotFactRetriever, // Adds the dependabotFactRetriever to the system.
          [sonarCloudFactRetriever.id]: sonarCloudFactRetriever // Adds the sonarCloudFactRetriever to the system.
        });

        // Register fact checkers
        logger.info('Registering SonarCloud fact checkers...');
        
        // Create the fact checkers from config
        const bugsCheck = createBugsCheck(config);
        const vulnerabilitiesCheck = createVulnerabilitiesCheck(config);
        const codeSmellsCheck = createCodeSmellsCheck(config);
        const qualityGateCheck = createQualityGateCheck(config);
        const codeCoverageCheck = createCodeCoverageCheck(config);
        
        // Log the configured thresholds for debugging
        logger.info(`Configured bugs threshold: ${(bugsCheck.rule.conditions as any).all[0].value}`);
        logger.info(`Configured vulnerabilities threshold: ${(vulnerabilitiesCheck.rule.conditions as any).all[0].value}`);
        logger.info(`Configured code smells threshold: ${(codeSmellsCheck.rule.conditions as any).all[0].value}`);
        logger.info(`Configured quality gate threshold: ${(qualityGateCheck.rule.conditions as any).all[0].value}`);
        logger.info(`Configured code coverage threshold: ${(codeCoverageCheck.rule.conditions as any).all[0].value}`);

        
        // Create the JSON Rules Engine factory with our checks
        const jsonRulesEngineFactChecker = new JsonRulesEngineFactCheckerFactory({
          checks: [
            bugsCheck,
            vulnerabilitiesCheck,
            codeSmellsCheck,
            qualityGateCheck,
            codeCoverageCheck,
          ],
          logger,
        });
        
        // Register the fact checker factory
        factCheckerProvider.setFactCheckerFactory(jsonRulesEngineFactChecker);
      },
    });
  },
});