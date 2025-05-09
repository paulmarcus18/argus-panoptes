import { CatalogApi } from '@backstage/plugin-catalog-react';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';
import { getReposBySystem } from './getReposBySystem'; // same as updated frontend version
import { stringifyEntityRef } from '@backstage/catalog-model';
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
          'github-commit-message-retriever',
        ]);
        const retriever = facts['github-commit-message-retriever'];
        const factsForEntity = retriever['facts'];
        const lastCommitMessage = factsForEntity.last_commit_message;

        if (typeof lastCommitMessage === 'string') {
          messages.push(lastCommitMessage);
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
