import { CatalogApi } from '@backstage/plugin-catalog-react';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';
import { getReposBySystem } from './getReposBySystem'; // same as updated frontend version
/**
 * Aggregates commit messages by system from stored Tech Insights facts (frontend-safe).
 */
interface CommitsPerRepo {
  repoName: string;
  commitMessages: string;
}

export async function getCommitMessagesBySystem(
  catalogApi: CatalogApi,
  techInsightsApi: TechInsightsApi,
): Promise<Record<string, CommitsPerRepo[]>> {
  const systemToEntityRefs = await getReposBySystem(catalogApi);
  const result: Record<string, CommitsPerRepo[]> = {};

  for (const [system, entityRefs] of Object.entries(systemToEntityRefs)) {
    const allCommitMessages: CommitsPerRepo[] = [];

    for (const entityRef of entityRefs) {
      try {
        const facts = await techInsightsApi.getFacts(entityRef, [
          'github-commit-message-retriever',
        ]);

        if (facts === undefined) {
          break;
        }
        const retriever = facts['github-commit-message-retriever'];
        const factsForEntity = retriever['facts'];
        const recentCommitMessages = factsForEntity.recent_commit_messages;

        if (typeof recentCommitMessages === 'string') {
          const commits: CommitsPerRepo = {
            repoName: entityRef.name,
            commitMessages: recentCommitMessages,
          };
          allCommitMessages.push(commits);
        } else {
          console.debug(`No commit messages found for ${entityRef.name}`);
        }
      } catch (error) {
        console.error(`Failed to retrieve facts for ${entityRef.name}:`, error);
      }
    }

    result[system] = allCommitMessages;
  }

  return result;
}
