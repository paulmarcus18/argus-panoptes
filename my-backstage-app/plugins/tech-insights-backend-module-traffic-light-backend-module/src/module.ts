/**
 * This file registers a backend module with the tech-insights plugin.
 * Adds two custom fact retrievers to the system, dependabotFactRetriever and sonarCloudFactRetriever.
 * Allows the plugin to collect Dependabot and SonarQube (SonarCloud) alerts for usage.
 */

// Imports the utility function used to define and create a backend module in Backstage.
import {
  createBackendModule,
  coreServices,
} from '@backstage/backend-plugin-api';
// Imports the tech insights extension point that lets you plug in custom FactRetrievers.
import {
  techInsightsFactRetrieversExtensionPoint,
  techInsightsFactCheckerFactoryExtensionPoint,
} from '@backstage-community/plugin-tech-insights-node';
// Imports retriever that queries Dependabot alert data.
import { createDependabotFactRetriever } from './dependabot/dependabotFactRetriever';
import { githubAdvancedSecurityFactRetriever } from './github-advanced-security/githubASFactRetriever';
import { githubPipelineStatusFactRetriever } from './pipelines/preproductionFactRetriever';
import { foundationPipelineStatusFactRetriever } from './pipelines/foundationFactRetriever';
import { reportingPipelineStatusFactRetriever } from './pipelines/reportingFactRetriever';
//import {createSonarCloudFactRetriever } from './sonarCloud/sonarCloudFactRetriever';
// Imports retriever that queries Azure DevOps bugs data.
import { createAzureDevOpsBugsRetriever } from './azure/azureDevOpsFactRetriever';
// Imports retriever that queries SonarCloud data.
import { createSonarCloudFactRetriever } from './sonarCloud/sonarCloudFactRetriever';
// Imports the fact retriever that collects data from Black Duck.
import {createBlackDuckFactRetriever} from './blackduck/blackduckFactRetriever';
// Import SonarCloud fact checkers.
import { sonarCloudChecks } from './sonarCloud/sonarCloudFactCheckers';
// Imports the fact checker factory that evaluates dynamic thresholds.
import { DynamicThresholdFactCheckerFactory } from './argusPanoptesFactChecker/service/dynamicThresholdFactChecker';
// Imports the CatalogClient to interact with the Backstage catalog.
import { CatalogClient } from '@backstage/catalog-client';

// Import the missing AuthenticatedCatalogApi class or function
import { AuthenticatedCatalogApi } from './authenticatedCatalogApi';
import { foundationPipelineChecks } from './pipelines/foundationFactChecker';
import { preproductionPipelineChecks } from './pipelines/preproductionFactChecker';

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
        discovery: coreServices.discovery,
        auth: coreServices.auth,
      },
      //initialization function that will run during backend's startup
      async init({
        providers,
        factCheckerProvider,
        logger,
        config,
        discovery,
        auth,
      }) {
        //logs to the console to confirm module is being registered
        logger.info('Registering dependabot-facts module...');
        const factRetriever = createDependabotFactRetriever(config, logger);
        const sonarCloudFactRetriever = createSonarCloudFactRetriever(
          config,
          logger,
        );

        const blackDuckFactRetriever = createBlackDuckFactRetriever(
          config,
          logger,
        );

        providers.addFactRetrievers({
          githubAdvancedSecurityFactRetriever,
          'azure-devops-bugs-retriever': createAzureDevOpsBugsRetriever,
          foundationPipelineStatusFactRetriever,
          githubPipelineStatusFactRetriever,
          reportingPipelineStatusFactRetriever,
          dependabotFactRetriever: factRetriever, // Adds the dependabotFactRetriever to the system.
          [sonarCloudFactRetriever.id]: sonarCloudFactRetriever, // Adds the sonarCloudFactRetriever to the system.
          [blackDuckFactRetriever.id]: blackDuckFactRetriever, // Adds the blackDuckFactRetriever to the system.
        });

        // Register fact checkers
        logger.info('Registering SonarCloud fact checkers...');
        logger.info('Registering Preproduction pipeline fact checkers...');

        // AuthenticatedCatalogApi is used to authenticate requests to the catalog service.
        const { token: catalogToken } = await auth.getPluginRequestToken({
          onBehalfOf: await auth.getOwnServiceCredentials(),
          targetPluginId: 'catalog',
        });

        const catalogClient = new CatalogClient({ discoveryApi: discovery });
        const authenticatedCatalogApi = new AuthenticatedCatalogApi(
          catalogClient,
          catalogToken,
        );

        // Create a new instance of the DynamicThresholdFactCheckerFactory
        // and pass the checks, logger, and authenticated catalog API to it.
        const sonarCloudFactCheckerFactory =
          new DynamicThresholdFactCheckerFactory({
            checks: [
              ...sonarCloudChecks,
              ...foundationPipelineChecks,
              ...preproductionPipelineChecks,
            ],
            logger,
            catalogApi: authenticatedCatalogApi,
          });

        // Register the fact checker factory with the fact checker provider.
        factCheckerProvider.setFactCheckerFactory(sonarCloudFactCheckerFactory);
      },
    });
  },
});
