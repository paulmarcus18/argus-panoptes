/**
 * This file reads a GitHub token from config, uses Octokit to fetch GitHub Advanced Security data
 * Returns security findings in a structured way that Tech Insights can consume
 */
import { FactRetriever } from '@backstage-community/plugin-tech-insights-node';

/**
 * This FactRetriever queries GitHub Advanced Security data for specified repositories
 * and returns security findings like code scanning alerts, secret scanning alerts, etc.
 */
export const githubAdvancedSecurityFactRetriever: FactRetriever = {
  // Identifier for this fact retriever
  id: 'githubAdvancedSecurityFactRetriever',
  // Versioning information for this retriever
  version: '0.1.0',
  // Defines the structure of the facts returned
  schema: {
    openCodeScanningAlertCount: {
      type: 'integer',
      description: 'Number of open Code Scanning alerts',
    },
    openSecretScanningAlertCount: {
      type: 'integer',
      description: 'Number of open Secret Scanning alerts',
    },
  },
  // Main logic of the retriever
  async handler({ config, logger }) {
    // Retrieve GitHub token from config
    let token: string | undefined;
    try {
      const githubConfigs = config.getOptionalConfigArray('integrations.github');
      const githubConfig = githubConfigs?.[0];
      token = githubConfig?.getOptionalString('token');

      logger.info(`🔍 Retrieved GitHub token: ${token ? '✔️ Present' : '❌ Missing'}`);
    } catch (e) {
      logger.error(`❌ Could not retrieve GitHub token: ${e}`);
      return [];
    }

    if (!token) {
      logger.error('❌ GitHub token is not defined.');
      return [];
    }

    // Use dynamic import for Octokit
    const { Octokit } = await import('@octokit/rest');
    
    // Initialize GitHub API client with token
    const octokit = new Octokit({ auth: token });

    // Declare repositories to check
    // TODO: Make this configurable or fetch from catalog
    const repos = [
      {
        owner: 'test-GHAS1',
        name: 'TrialSonarQube',
      },
      // Add more repos as needed
    ];

    // Perform parallel fetching for all repos
    const results = await Promise.all(
      repos.map(async repo => {
        try {
          // Fetch Code Scanning alerts
          const codeScanningResponse = await octokit.request(
            'GET /repos/{owner}/{repo}/code-scanning/alerts',
            {
              owner: repo.owner,
              repo: repo.name,
              state: 'open',
              per_page: 100,
            },
          );
          
          // Fetch Secret Scanning alerts
          const secretScanningResponse = await octokit.request(
            'GET /repos/{owner}/{repo}/secret-scanning/alerts',
            {
              owner: repo.owner,
              repo: repo.name,
              state: 'open',
              per_page: 100,
            },
          );

          // Return the fact result object for this repository
          return {
            entity: {
              kind: 'Component',
              namespace: 'default',
              name: repo.name,
            },
            facts: {
              openCodeScanningAlertCount: codeScanningResponse.data.length,
              openSecretScanningAlertCount: secretScanningResponse.data.length,
            },
          };
        } catch (err: any) {
          if (err.status === 403 || err.status === 404) {
            logger.warn(
              `⚠️ Access denied to security data for ${repo.name} (status ${err.status}) — skipping`,
            );
            return null;
          }
          logger.error(
            `❌ Error fetching security data for ${repo.name}: ${err.message} (status ${err.status})`,
          );
          return null;
        }
      }),
    );

    // Filter null results
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
};