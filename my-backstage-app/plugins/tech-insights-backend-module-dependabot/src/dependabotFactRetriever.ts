import { FactRetriever } from '@backstage-community/plugin-tech-insights-node';
import { Octokit } from '@octokit/rest';

/**
 * This FactRetriever queries all public repos under the 'philips-labs' org
 * and returns the number of open Dependabot alerts per repository.
 */
export const dependabotFactRetriever: FactRetriever = {
  id: 'dependabotFactRetriever',
  version: '0.1.0',
  schema: {
    openAlertCount: {
      type: 'integer',
      description: 'Number of open Dependabot alerts for philips-labs repos',
    },
  },
  async handler({ config, logger }) {
    let token: string | undefined;

    try {
      const githubIntegrations = config.getConfigArray('integrations.github');
      token = githubIntegrations[0]?.getString('token');
      logger.info(`🔍 Retrieved GitHub token: ${token ? '✔️ Present' : '❌ Missing'}`);
    } catch (e) {
      logger.error(`Could not retrieve GitHub token: ${e}`);
      return [];
    }

    if (!token) {
      logger.error('GitHub token is not defined in config.');
      return [];
    }

    const octokit = new Octokit({ auth: token });

    try {
      // Step 1: Fetch all public repos under the 'philips-labs' GitHub organization
      const reposResponse = await octokit.repos.listForOrg({
        org: 'philips-labs',
        type: 'public',
        per_page: 100,
      });

      const repos = reposResponse.data;

      // Step 2: For each repo, fetch open Dependabot alerts
      const results = await Promise.all(
        repos.map(async repo => {
          try {
            const alertsResponse = await octokit.request(
              'GET /repos/{owner}/{repo}/dependabot/alerts',
              {
                owner: repo.owner.login,
                repo: repo.name,
                per_page: 100,
              },
            );

            const openAlerts = alertsResponse.data.filter(alert => alert.state === 'open');

            return {
              entity: {
                kind: 'Component',
                namespace: 'default',
                name: repo.name,
              },
              facts: {
                openAlertCount: openAlerts.length,
              },
            };
          } catch (err: any) {
            if (err.status === 403 || err.status === 404) {
              logger.warn(`Access denied to alerts for ${repo.name} — skipping`);
              return null;
            }
            logger.error(`Error fetching alerts for ${repo.name}: ${err}`);
            return null;
          }
        }),
      );

      return results.filter((r): r is NonNullable<typeof r> => r !== null);
    } catch (e) {
      logger.error(`Failed to fetch repos from philips-labs: ${e}`);
      return [];
    }
  },
};
