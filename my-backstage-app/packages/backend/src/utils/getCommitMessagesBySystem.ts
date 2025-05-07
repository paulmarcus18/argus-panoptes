import { CatalogApi } from '@backstage/catalog-client';
import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { createGitHubCommitMessageRetriever } from '../modules/githubFactRetrieverUtils';
import { getReposBySystem } from './getReposBySystem';
import { Entity } from '@backstage/catalog-model';

export async function getCommitMessagesBySystemUsingRetriever(
  catalogApi: CatalogApi,
  config: Config,
  logger: LoggerService,
): Promise<Record<string, string>> {
  const retriever = createGitHubCommitMessageRetriever(config, logger);
  const systemToRepoNames = await getReposBySystem(catalogApi);
  const result: Record<string, string> = {};

  for (const [system, repoNames] of Object.entries(systemToRepoNames)) {
    const messages: string[] = [];

    for (const name of repoNames) {
      const { items } = await catalogApi.getEntities({
        filter: {
          kind: 'component',
          'metadata.name': name,
        },
      });

      const entity: Entity | undefined = items[0];
      if (!entity) {
        logger.warn(`No entity found for component name: ${name}`);
        continue;
      }

      try {
        const factsArray = await retriever.handler({ entity } as any);
        const fact = factsArray?.[0];
        const commitMessages = fact?.facts?.recent_commit_messages;

        if (typeof commitMessages === 'string') {
          messages.push(commitMessages);
        }
      } catch (err) {
        logger.error(`Failed to retrieve facts for entity ${entity.metadata.name}: ${err}`);
      }
    }

    result[system] = messages.join('\n');
  }

  return result;
}