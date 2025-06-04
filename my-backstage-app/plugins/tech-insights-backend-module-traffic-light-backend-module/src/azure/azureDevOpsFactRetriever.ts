import { FactRetriever } from '@backstage-community/plugin-tech-insights-node';
import { Entity } from '@backstage/catalog-model';
import { CatalogClient } from '@backstage/catalog-client';

export const createAzureDevOpsBugsRetriever: FactRetriever = {
  id: 'azure-devops-bugs-retriever',
  version: '1.0',
  entityFilter: [{ kind: 'component' }],
  schema: {
    azure_bug_count: {
      type: 'integer',
      description: 'Number of Azure DevOps bugs from WIQL query',
    },
  },
  handler: async ctx => {
    const { token } = await ctx.auth.getPluginRequestToken({
      onBehalfOf: await ctx.auth.getOwnServiceCredentials(),
      targetPluginId: 'catalog',
    });
    const client = new CatalogClient({ discoveryApi: ctx.discovery });

    let entities: Entity[] = [];

    try {
      const response = await client.getEntities(
        { filter: { kind: 'Component' } },
        { token }
      );
      entities = response.items ?? [];
      console.info(`📦 Fetched ${entities.length} component entities`);
    } catch (e) {
      console.error(`❌ Failed to fetch entities: ${e}`);
      return [];
    }

    const azureConfigs = ctx.config.getOptionalConfigArray('integrations.azure');
    const azureConfig = azureConfigs?.[0];
    const pat = azureConfig?.getOptionalString('token');

    if (!pat) {
      console.error('❌ Azure DevOps token is not defined.');
      const pat = undefined;
    }

    const results = [];

    for (const entity of entities) {
      const annotations = entity.metadata.annotations ?? {};

      const organization = annotations['azure.com/organization'];
      const project = annotations['azure.com/project'];
      const bugsQueryId = annotations['azure.com/bugs-query-id'];

      if (!organization || !project || !bugsQueryId || !pat) {
        console.warn(`⚠️ Missing Azure DevOps annotations for ${entity.metadata.name}`);
        results.push({
          entity: {
            name: entity.metadata.name,
            namespace: entity.metadata.namespace ?? 'default',
            kind: entity.kind,
          },
          facts: {
            azure_bug_count: -1,
          },
        });
        continue;
      }

      const encodedPat = Buffer.from(':' + pat).toString('base64');

      try {
        const response = await fetch(
          `https://dev.azure.com/${organization}/${project}/_apis/wit/wiql/${bugsQueryId}?api-version=7.0`,
          {
            method: 'GET',
            headers: {
              Authorization: `Basic ${encodedPat}`,
              Accept: 'application/json',
            },
          }
        );

        if (!response.ok) {
          console.error(
            `❌ Failed to fetch WIQL results for ${entity.metadata.name}: ${response.statusText}`,
          );
          continue;
        }

        const data = await response.json();
        const bugs = data.workItems ?? [];
        const bugCount = bugs.length;

        console.info(`🐞 ${entity.metadata.name} has ${bugCount} Azure DevOps bugs`);

        results.push({
          entity: {
            name: entity.metadata.name,
            namespace: entity.metadata.namespace ?? 'default',
            kind: entity.kind,
          },
          facts: {
            azure_bug_count: bugCount,
          },
        });
      } catch (err) {
        console.error(`❌ Error retrieving bugs for ${entity.metadata.name}: ${err}`);
      }
    }

    return results;
  },
};
