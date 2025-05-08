// import { Config } from '@backstage/config';
// import { FactRetriever } from '@backstage-community/plugin-tech-insights-node';
// import { LoggerService } from '@backstage/backend-plugin-api';
// import { createFactRetrieverBackendModule } from '../factRetrieverUtils';

// interface GitHubPR {
//   title: string;
//   number: number;
//   commits_url: string;
//   html_url: string;
//   merged_at: string;
// }

// interface GitHubCommit {
//   commit: {
//     message: string;
//     author: {
//       name: string;
//       date: string;
//     };
//   };
//   sha: string;
//   html_url: string;
// }

// export const createGitHubCommitMessageRetriever = (
//   config: Config,
//   logger: LoggerService,
// ): FactRetriever => {
//   return {
//     id: 'github-commit-message-retriever',
//     version: '1.0',
//     entityFilter: [{ kind: 'component' }],
//     schema: {
//       last_commit_message: {
//         type: 'string',
//         description: 'The last commit message from the most recent pull request',
//       },
//       recent_commit_messages: {
//         type: 'string',
//         description: 'List of recent commit messages from merged PRs',
//       },
//       commit_count_last_week: {
//         type: 'integer',
//         description: 'Number of commits in the last week',
//       }
//     },

//     handler: async ctx => {
//       // Don't hardcode tokens in production code
//       const githubToken = config.getOptionalString('github.token') ||
//         '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';
//       const repoOwner = 'philips-labs';
//       const repoName = 'argus-panoptes';

//       logger.info(`Fetching recent PRs for ${repoOwner}/${repoName}`);

//       try {
//         // Get the last 5 PRs
//         const prResponse = await fetch(
//           `https://api.github.com/repos/${repoOwner}/${repoName}/pulls?state=closed&sort=updated&direction=desc&per_page=5`,
//           {
//             headers: {
//               Authorization: `token ${githubToken}`,
//               Accept: 'application/vnd.github.v3+json',
//             },
//           },
//         );

//         if (!prResponse.ok) {
//           logger.error(`Failed to fetch PRs: ${prResponse.statusText}`);
//           return [];
//         }

//         const prs: GitHubPR[] = await prResponse.json();

//         if (!prs.length) {
//           logger.warn(`No PRs found for ${repoOwner}/${repoName}`);
//           return [];
//         }

//         const lastPr = prs[0];
//         const prTitle = lastPr.title;

//         // Get all commits from the last merged PR
//         let allCommitMessages: string[] = [];
//         let commitCountLastWeek = 0;
//         const oneWeekAgo = new Date();
//         oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

//         // Process each PR to collect commit messages
//         for (const pr of prs) {
//           const commitsResponse = await fetch(pr.commits_url, {
//             headers: {
//               Authorization: `token ${githubToken}`,
//               Accept: 'application/vnd.github.v3+json',
//             },
//           });

//           if (!commitsResponse.ok) {
//             logger.warn(`Failed to fetch commits for PR #${pr.number}: ${commitsResponse.statusText}`);
//             continue;
//           }

//           const commits: GitHubCommit[] = await commitsResponse.json();

//           // Count commits from past week
//           const recentCommits = commits.filter(commit => {
//             const commitDate = new Date(commit.commit.author.date);
//             return commitDate > oneWeekAgo;
//           });

//           commitCountLastWeek += recentCommits.length;

//           // Log all commit messages for this PR
//           console.log(`\n====== Commits for PR #${pr.number}: ${pr.title} ======`);

//           for (const commit of commits) {
//             const shortMessage = commit.commit.message.split('\n')[0]; // First line only
//             console.log(`- ${shortMessage} (${commit.sha.substring(0, 7)})`);
//             allCommitMessages.push(shortMessage);
//           }
//         }

//         // Join all commit messages into a single string with newlines
//         const recentCommitMessages = allCommitMessages.join('\n');

//         console.log('\n====== Summary ======');
//         console.log(`Total recent PRs processed: ${prs.length}`);
//         console.log(`Total commits in the last week: ${commitCountLastWeek}`);
//         console.log(`Total commit messages collected: ${allCommitMessages.length}`);

//         return [
//           {
//             entity: {
//               name: 'argus-panoptes',
//               namespace: 'default',
//               kind: 'component',
//             },
//             facts: {
//               last_commit_message: prTitle,
//               recent_commit_messages: recentCommitMessages,
//               commit_count_last_week: commitCountLastWeek
//             },
//           },
//         ];
//       } catch (err) {
//         logger.error(`Error retrieving commit messages: ${err}`);
//         return [];
//       }
//     },
//   };
// };

// export const techInsightsModuleGitHubCommitRetriever =
//   createFactRetrieverBackendModule({
//     pluginId: 'tech-insights',
//     moduleId: 'github-commit-message-retriever',
//     createFactRetriever: createGitHubCommitMessageRetriever,
//     logMessage: 'Registering GitHub commit message fact retriever',
//   });

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

      const githubToken = config.getOptionalString('github.token');

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
                Authorization: `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`,
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

          const lastPr = prs[0];
          const prTitle = lastPr.title;
          logger.info(` PR TITLE ${prTitle}`);

          let allCommitMessages: string[] = [];
          let commitCountLastWeek = 0;
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

          for (const pr of prs) {
            const commitsResponse = await fetch(pr.commits_url, {
              headers: {
                Authorization: `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`,
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
