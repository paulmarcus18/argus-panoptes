import { Config } from '@backstage/config/index';
import { FactRetriever } from '@backstage-community/plugin-tech-insights-node';
import { LoggerService } from '@backstage/backend-plugin-api';
import { createFactRetrieverBackendModule } from '../factRetrieverUtils';
import { CatalogClient } from '@backstage/catalog-client';

// Define an interface for the SonarCloud measure
interface SonarCloudMeasure {
  metric: string;
  value: string;
  bestValue?: boolean;
}

/**
 * Create a fact retriever for SonarCloud metrics
 */
export const createSonarCloudFactRetriever = (
  config: Config,
  logger: LoggerService,
): FactRetriever => {
  return {
    id: 'sonarcloud-fact-retriever',
    version: '1.0',
    entityFilter: [{ kind: 'component' }], // Filter for all components
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
    handler: async ctx => {
      const { config: appConfig, logger, discovery, auth, entityFilter } = ctx;

      const sonarcloudConfig = config.getConfig('sonarcloud');
      const token = sonarcloudConfig.getString('token');
      // const organization = sonarcloudConfig.getString('organization');

      const { token: catalogToken } = await auth.getPluginRequestToken({
        onBehalfOf: await auth.getOwnServiceCredentials(),
        targetPluginId: 'catalog',
      });

      // 2. Instantiate the CatalogClient
      const catalogClient = new CatalogClient({ discoveryApi: discovery });

      // 3. Fetch the list of entities matching your entityFilter
      const { items: entities } = await catalogClient.getEntities(
        { filter: entityFilter },
        { token: catalogToken },
      );

      // Filter entities that have SonarCloud enabled
      const sonarcloudEntities = entities.filter(
        entity =>
          entity.metadata.annotations?.['sonarcloud.io/enabled'] === 'true' &&
          entity.metadata.annotations?.['sonarcloud.io/project-key'], //&& // maybe && (... xor ... xor ...) if each repo is part of a different system
        //   entity.spec?.system === 'payments-system'
      );

      // Process each entity with SonarCloud enabled
      const results = await Promise.all(
        sonarcloudEntities.map(async entity => {
          const projectKey =
            entity.metadata.annotations?.['sonarcloud.io/project-key'];
          logger.info(`Retrieving SonarCloud metrics for ${projectKey}`);

          const response = await fetch(
            `https://sonarcloud.io/api/measures/component?component=${projectKey}&metricKeys=bugs,code_smells,security_hotspots`,
            {
              headers: {
                Authorization: `Basic ${Buffer.from(`${token}:`).toString(
                  'base64',
                )}`,
              },
            },
          );

          if (!response.ok) {
            const errorText = await response.text();
            logger.error(
              `SonarCloud API error for ${projectKey}: ${response.status} ${response.statusText} - ${errorText}`,
            );
            return null;
          }

          const data = await response.json();
          logger.info(
            `SonarCloud API returned data for ${projectKey}: ${JSON.stringify(
              data,
            )}`,
            { factRetrieverId: 'sonarcloud-fact-retriever' },
          );

          const measures = data.component.measures as SonarCloudMeasure[];
          const facts = {
            bugs: parseInt(
              measures.find((m: SonarCloudMeasure) => m.metric === 'bugs')
                ?.value || '0',
              10,
            ),
            code_smells: parseInt(
              measures.find(
                (m: SonarCloudMeasure) => m.metric === 'code_smells',
              )?.value || '0',
              10,
            ),
            security_hotspots: parseInt(
              measures.find(
                (m: SonarCloudMeasure) => m.metric === 'security_hotspots',
              )?.value || '0',
              10,
            ),
          };

          logger.info(
            `Extracted facts for ${projectKey}: ${JSON.stringify(facts)}`,
            { factRetrieverId: 'sonarcloud-fact-retriever' },
          );

          return {
            entity: {
              name: entity.metadata.name,
              namespace: entity.metadata.namespace || 'default',
              kind: entity.kind,
            },
            facts: facts, //try with only facts, instead of facts:facts
          };
        }),
      );

      // Filter out null results (failed requests)
      return results.filter(Boolean) as Array<{
        entity: { kind: string; namespace: string; name: string };
        facts: { bugs: number; code_smells: number; security_hotspots: number };
      }>;
    },
  };
};

// Create and export the SonarCloud fact retriever backend module
export const techInsightsModuleSonarCloudFactRetriever =
  createFactRetrieverBackendModule({
    pluginId: 'tech-insights',
    moduleId: 'sonarcloud-fact-retriever',
    createFactRetriever: createSonarCloudFactRetriever,
    logMessage: 'Registering SonarCloud fact retriever',
  });
