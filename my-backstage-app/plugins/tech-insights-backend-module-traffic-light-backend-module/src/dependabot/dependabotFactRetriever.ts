import { FactRetriever } from '@backstage-community/plugin-tech-insights-node';
import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { CatalogClient } from '@backstage/catalog-client';

/**
 * Creates a fact retriever that dynamically queries all catalog entities and retrieves Dependabot alerts.
 */
export const createDependabotFactRetriever = (
  config: Config,
  logger: LoggerService,
): FactRetriever => {
  return {
    id: 'dependabotFactRetriever',
    version: '0.2.0',
    entityFilter: [{ kind: 'Component' }],
    schema: {
      'dependabot:status': {
        type: 'string',
        description: 'Traffic light status based on Dependabot alert counts',
      },
    },
    handler: async ({ discovery, auth }) => {
      const githubConfigs = config.getOptionalConfigArray('integrations.github');
      const githubToken = githubConfigs?.[0]?.getOptionalString('token');
      if (!githubToken) {
        logger.error('Missing GitHub token in config');
        return [];
      }

      const { token: catalogToken } = await auth.getPluginRequestToken({
        onBehalfOf: await auth.getOwnServiceCredentials(),
        targetPluginId: 'catalog',
      });

      const catalogClient = new CatalogClient({ discoveryApi: discovery });
      const { items: entities } = await catalogClient.getEntities(
        { filter: [{ kind: 'Component' }] },
        { token: catalogToken },
      );

      const Octokit = (await import('@octokit/rest')).Octokit;
      const octokit = new Octokit({ auth: githubToken });

      const results = await Promise.all(
        entities.map(async entity => {
          const repoUrl = entity.metadata.annotations?.['github.com/project-slug'];
          if (!repoUrl) return null;

          const [owner, name] = repoUrl.split('/');
          try {
            const alertsResponse = await octokit.request(
              'GET /repos/{owner}/{repo}/dependabot/alerts',
              { owner, repo: name, per_page: 100 },
            );
            const openAlerts = alertsResponse.data.filter(a => a.state === 'open');
            const alertCount = openAlerts.length;

            let color: 'green' | 'yellow' | 'red';
            if (alertCount === 0) {
              color = 'green';
            } else if (alertCount <= 5) {
              color = 'yellow';
            } else {
              color = 'red';
            }

            logger.info(`✅ ${entity.metadata.name} → ${color} (${alertCount} alerts)`);

            return {
              entity: {
                name: entity.metadata.name,
                kind: entity.kind,
                namespace: entity.metadata.namespace ?? 'default',
              },
              facts: {
                'dependabot:status': { color },
              }
            };
          } catch (e) {
            logger.warn(`Failed to fetch alerts for ${repoUrl}: ${e}`);
            return null;
          }
        }),
      );

      return results.filter(Boolean) as NonNullable<Awaited<ReturnType<FactRetriever['handler']>>>;
    },
  };
};
