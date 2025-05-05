import { FactRetriever } from '@backstage-community/plugin-tech-insights-node';
import { Octokit } from '@octokit/rest';

/**
 * This FactRetriever queries the 'philips-labs/dct-notary-admin' repo
 * and returns the number of open Dependabot alerts.
 */
export const dependabotFactRetriever: FactRetriever = {
  id: 'dependabotFactRetriever',
  version: '0.1.0',
  schema: {
    openAlertCount: {
      type: 'integer',
      description: 'Number of open Dependabot alerts for dct-notary-admin repo',
    },
  },
  async handler({ config, logger }) {
    let token: string | undefined;

    try {
      const githubConfigs = config.getOptionalConfigArray('integrations.github');
      const githubConfig = githubConfigs?.[0];
      token = githubConfig?.getOptionalString('token');

      logger.info(`🔍 Retrieved GitHub token: ${token ? '✔️ Present' : '❌ Missing'}`);
      // Remove the next line in production
      logger.info(`DEBUG: GitHub token = ${token}`);
    } catch (e) {
      logger.error(`❌ Could not retrieve GitHub token: ${e}`);
      return [];
    }

    if (!token) {
      logger.error('❌ GitHub token is not defined.');
      return [];
    }

    const octokit = new Octokit({ auth: token });

    const repos = [
      {
        owner: { login: 'philips-labs' },
        name: 'dct-notary-admin',
      },
    ];

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
            logger.warn(`⚠️ Access denied to alerts for ${repo.name} (status ${err.status}) — skipping`);
            return null;
          }
          logger.error(`❌ Error fetching alerts for ${repo.name}: ${err.message} (status ${err.status})`);
          return null;
        }
      }),
    );

    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
};
