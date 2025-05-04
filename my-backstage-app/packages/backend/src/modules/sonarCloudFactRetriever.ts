import { Config } from '@backstage/config/index';
import { FactRetriever } from '@backstage-community/plugin-tech-insights-node';
import { LoggerService } from '@backstage/backend-plugin-api';
import { createFactRetrieverBackendModule } from '../factRetrieverUtils';

// Define an interface for the SonarCloud measure
interface SonarCloudMeasure {
  metric: string;
  value: string;
  bestValue?: boolean;
}

/**
 * Create a fact retriever for SonarCloud metrics
 */
export const createSonarCloudFactRetriever = (config: Config, logger: LoggerService): FactRetriever => {
  return {
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
      }
    },
    handler: async ctx => {
      const { config, logger } = ctx;
      const sonarcloudConfig = config.getConfig('sonarcloud');
      const token = sonarcloudConfig.getString('token');
      const organization = sonarcloudConfig.getString('organization');
     
      try {
        logger.info(`Retrieving SonarCloud metrics for ${organization}_tabia`);
       
        const response = await fetch(
          `https://sonarcloud.io/api/measures/component?component=${organization}_tabia&metricKeys=bugs,code_smells,security_hotspots`,
          {
            headers: {
              'Authorization': `Basic ${Buffer.from(`${token}:`).toString('base64')}`,
            },
          }
        );
       
        if (!response.ok) {
          const errorText = await response.text();
          logger.error(`SonarCloud API error: ${response.status} ${response.statusText} - ${errorText}`);
          return [];
        }
       
        const data = await response.json();
        logger.info(`SonarCloud API returned data: ${JSON.stringify(data)}`);
       
        const measures = data.component.measures as SonarCloudMeasure[];
        const facts = {
          bugs: parseInt(measures.find((m: SonarCloudMeasure) => m.metric === 'bugs')?.value || '0', 10),
          code_smells: parseInt(measures.find((m: SonarCloudMeasure) => m.metric === 'code_smells')?.value || '0', 10),
          security_hotspots: parseInt(measures.find((m: SonarCloudMeasure) => m.metric === 'security_hotspots')?.value || '0', 10),
        };
       
        logger.info(`Extracted facts: ${JSON.stringify(facts)}`);
       
        return [{
          entity: {
            name: 'tabia',
            namespace: 'default',
            kind: 'component'
          },
          facts: facts,
        }];
      } catch (error) {
        logger.error(`Failed to fetch SonarCloud metrics: ${error}`);
        return [];
      }
    },
  };
};

// Create and export the SonarCloud fact retriever backend module
export const techInsightsModuleSonarCloudFactRetriever = createFactRetrieverBackendModule({
  pluginId: 'tech-insights',
  moduleId: 'sonarcloud-fact-retriever',
  createFactRetriever: createSonarCloudFactRetriever,
  logMessage: 'Registering SonarCloud fact retriever',
});