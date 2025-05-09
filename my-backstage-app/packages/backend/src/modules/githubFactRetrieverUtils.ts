import { Config } from '@backstage/config';
import {
  FactRetriever,
  FactRetrieverContext,
} from '@backstage-community/plugin-tech-insights-node';
import { LoggerService } from '@backstage/backend-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { createFactRetrieverBackendModule } from '../factRetrieverUtils';
import { CatalogClient } from '@backstage/catalog-client';

interface GitHubPR {
  title: string;
  number: number;
  commits_url: string;
  html_url: string;
  merged_at: string;
}

interface GitHubCommit {
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  sha: string;
  html_url: string;
}

interface ExtendedContext extends FactRetrieverContext {
  entity?: Entity;
  entities?: Entity[];
}

export const createGitHubCommitMessageRetriever = (
  config: Config,
  logger: LoggerService,
): FactRetriever => {
  return {
    id: 'github-commit-message-retriever',
    version: '1.0',
    entityFilter: [{ kind: 'component' }],
    schema: {
      last_commit_message: {
        type: 'string',
        description:
          'The last commit message from the most recent pull request',
      },
      recent_commit_messages: {
        type: 'string',
        description: 'List of recent commit messages from merged PRs',
      },
      commit_count_last_week: {
        type: 'integer',
        description: 'Number of commits in the last week',
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
          {
            filter: { kind: 'Component' },
          },
          { token },
        );
        entities = response.items ?? [];

        logger.info(
          `Fetched ${entities.length} component entities from catalog`,
        );
      } catch (e) {
        logger.error(`Failed to fetch entities from catalog: ${e}`);
        return [];
      }

      logger.info(`Fact retriever running for ${entities.length} entities`);
      logger.info(`Entities:  ${entities} `);

      const results = [];

      for (const entity of entities) {
        logger.info(
          `Entity: ${entity.metadata.name}, Annotations: ${JSON.stringify(
            entity.metadata.annotations,
          )}`,
        );

        const slug = entity.metadata.annotations?.['github.com/project-slug'];
        if (!slug) {
          logger.warn(
            `No GitHub slug annotation found for entity: ${entity.metadata.name}`,
          );
          continue;
        }

        const [repoOwner, repoName] = slug.split('/');
        logger.info(`Fetching recent PRs for ${repoOwner}/${repoName}`);

        try {
          const prResponse = await fetch(
            `https://api.github.com/repos/${repoOwner}/${repoName}/pulls?state=closed&sort=updated&direction=desc&per_page=5`,
            {
              headers: {
                Authorization: `Bearer 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`,
                Accept: 'application/vnd.github.v3+json',
              },
            },
          );

          logger.info(`GitHub PR API response status: ${prResponse.status}`);

          if (!prResponse.ok) {
            logger.error(`Failed to fetch PRs: ${prResponse.statusText}`);
            continue;
          }

          const prs: GitHubPR[] = await prResponse.json();
          if (!prs.length) {
            logger.warn(`No PRs found for ${repoOwner}/${repoName}`);
            continue;
          }

          const now = new Date();
          const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

          const recentPRs = prs.filter(pr => {
            if (!pr.merged_at) return false;
            const mergedAt = new Date(pr.merged_at);
            return mergedAt >= oneDayAgo;
          });

          if (recentPRs.length != 0) {
            const lastPr = recentPRs[0];
            const prTitle = lastPr.title;
            logger.info(` PR TITLE ${prTitle}`);

            let allCommitMessages: string[] = [];
            let commitCountLastWeek = 0;
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            for (const pr of recentPRs) {
              const commitsResponse = await fetch(pr.commits_url, {
                headers: {
                  Authorization: `Bearer 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`,
                  Accept: 'application/vnd.github.v3+json',
                },
              });

              if (!commitsResponse.ok) {
                logger.warn(
                  `Failed to fetch commits for PR #${pr.number}: ${commitsResponse.statusText}`,
                );
                continue;
              }

              const commits: GitHubCommit[] = await commitsResponse.json();

              const recentCommits = commits.filter(commit => {
                const commitDate = new Date(commit.commit.author.date);
                return commitDate > oneWeekAgo;
              });

              commitCountLastWeek += recentCommits.length;

              for (const commit of commits) {
                const shortMessage = commit.commit.message.split('\n')[0];
                logger.info(` commit TITLE ${shortMessage}`);
                allCommitMessages.push(shortMessage);
              }
            }

            const recentCommitMessages = allCommitMessages.join('\n');

            results.push({
              entity: {
                name: entity.metadata.name,
                namespace: entity.metadata.namespace ?? 'default',
                kind: entity.kind,
              },
              facts: {
                last_commit_message: prTitle,
                recent_commit_messages: recentCommitMessages,
                commit_count_last_week: commitCountLastWeek,
              },
            });
          }
        } catch (err) {
          logger.error(
            `Error retrieving commit messages for ${entity.metadata.name}: ${err}`,
          );
        }
      }

      return results;
    },
  };
};

// Registration
export const techInsightsModuleGitHubCommitRetriever =
  createFactRetrieverBackendModule({
    pluginId: 'tech-insights',
    moduleId: 'github-commit-message-retriever',
    createFactRetriever: createGitHubCommitMessageRetriever,
    logMessage: 'Registering GitHub commit message fact retriever',
  });
