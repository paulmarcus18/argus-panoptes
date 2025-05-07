import { LoggerService } from '@backstage/backend-plugin-api';
import { getReposBySystem } from './getReposBySystem';
import { Entity } from '@backstage/catalog-model';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { CatalogClient } from '@backstage/catalog-client/index';

/**
 * Aggregates commit messages by system using stored Tech Insights facts.
 */
export async function getCommitMessagesBySystem(
  catalogApi: CatalogClient,
  techInsightsApi: {
    getFacts: (
      entityRef: { kind: string; namespace?: string; name: string },
      facts: string[],
    ) => Promise<Record<string, any>>;
  },
  logger: LoggerService,
): Promise<Record<string, string>> {
  const systemToRepoNames = await getReposBySystem(catalogApi);
  const result: Record<string, string> = {};

  for (const [system, repoNames] of Object.entries(systemToRepoNames)) {
    const messages: string[] = [];

    for (const name of repoNames) {
      // Look up the entity by its name
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

      const entityRef = stringifyEntityRef(entity);

      try {
        const facts = await techInsightsApi.getFacts(
          {
            kind: entity.kind,
            namespace: entity.metadata.namespace ?? 'default',
            name: entity.metadata.name,
          },
          ['recent_commit_messages'],
        );

        const commitMessages = facts['recent_commit_messages'];

        if (typeof commitMessages === 'string') {
          messages.push(commitMessages);
        } else {
          logger.debug(`No commit messages found for ${entityRef}`);
        }
      } catch (err) {
        logger.error(`Failed to retrieve facts for ${entityRef}: ${err}`);
      }
    }

    result[system] = messages.join('\n');
  }

  return result;
}
