import { CatalogApi } from '@backstage/plugin-catalog-react';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';
import { getReposBySystem } from './getReposBySystem'; // same as updated frontend version

/**
 * Aggregates commit messages by system from stored Tech Insights facts (frontend-safe).
 */
export async function getCommitMessagesBySystem(
  catalogApi: CatalogApi,
  techInsightsApi: TechInsightsApi,
): Promise<Record<string, string>> {
  const systemToEntityRefs = await getReposBySystem(catalogApi);
  const result: Record<string, string> = {};

  for (const [system, entityRefs] of Object.entries(systemToEntityRefs)) {
    const messages: string[] = [];

    for (const entityRef of entityRefs) {
      try {
        const facts = await techInsightsApi.getFacts(entityRef, [
          'recent_commit_messages',
        ]);
        const commitMessages = facts['recent_commit_messages'];

        if (typeof commitMessages === 'string') {
          messages.push(commitMessages);
        } else {
          console.debug(`No commit messages found for ${entityRef.name}`);
        }
      } catch (error) {
        console.error(`Failed to retrieve facts for ${entityRef.name}:`, error);
      }
    }

    result[system] = messages.join('\n');
  }

  return result;
}
