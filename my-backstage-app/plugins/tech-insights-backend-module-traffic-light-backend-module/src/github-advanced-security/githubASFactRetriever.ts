/**
 * This file reads a GitHub token from config, uses Octokit to fetch GitHub Advanced Security data
 * Returns security findings in a structured way that Tech Insights can consume
 */
import { FactRetriever } from '@backstage-community/plugin-tech-insights-node';
import { CatalogClient } from '@backstage/catalog-client';

/**
 * This FactRetriever queries GitHub Advanced Security data for specified repositories
 * and returns security findings like code scanning alerts, secret scanning alerts, etc.
 */
export const githubAdvancedSecurityFactRetriever: FactRetriever = {
  // Identifier for this fact retriever
  id: 'githubAdvancedSecurityFactRetriever',
  // Versioning information for this retriever
  version: '0.1.0',
  // Entity filter to specify which entities this retriever applies to
  entityFilter: [{kind: 'component'}],
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
  async handler({ config, logger, entityFilter, auth, discovery }) {
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

    // Get catalog access token for fetching entities
    const { token: catalogToken } = await auth.getPluginRequestToken({
      onBehalfOf: await auth.getOwnServiceCredentials(),
      targetPluginId: 'catalog',
    });

    // Instantiate the CatalogClient
    const catalogClient = new CatalogClient({ discoveryApi: discovery });

    // Fetch the list of entities matching the entityFilter
    const { items: entities } = await catalogClient.getEntities(
      { filter: entityFilter },
      { token: catalogToken },
    );

    logger.info(`📋 Found ${entities.length} entities matching the filter`);

    // Filter entities that have GitHub repositories
    // The standard Backstage annotation for GitHub repositories is 'github.com/project-slug'
    const githubEntities = entities.filter(entity => {
      return entity.metadata.annotations?.['github.com/project-slug'];
    });

    logger.info(`🔍 Found ${githubEntities.length} entities with GitHub annotations`);

    // Use dynamic import for Octokit
    const { Octokit } = await import('@octokit/rest');
    
    // Initialize GitHub API client with token
    const octokit = new Octokit({ auth: token });

    // Process each entity with GitHub integration
    const results = await Promise.all(
      githubEntities.map(async entity => {
        // Extract owner and repo from the 'github.com/project-slug' annotation
        // This annotation typically has the format 'owner/repo'
        const projectSlug = entity.metadata.annotations?.['github.com/project-slug'] || '';
        const [owner, repo] = projectSlug.split('/');

        if (!owner || !repo) {
          logger.warn(`⚠️ Invalid GitHub project slug for entity ${entity.metadata.name}: ${projectSlug}`);
          return null;
        }

        logger.info(`📊 Retrieving GitHub security data for ${owner}/${repo}`);

        try {
          // Fetch Code Scanning alerts
          const codeScanningResponse = await octokit.request(
            'GET /repos/{owner}/{repo}/code-scanning/alerts',
            {
              owner,
              repo,
              state: 'open',
              per_page: 100,
            },
          );
          
          // Fetch Secret Scanning alerts
          const secretScanningResponse = await octokit.request(
            'GET /repos/{owner}/{repo}/secret-scanning/alerts',
            {
              owner,
              repo,
              state: 'open',
              per_page: 100,
            },
          );

          logger.info(
            `📊 GitHub security metrics for ${owner}/${repo}: ` +
            `Code Scanning: ${codeScanningResponse.data.length}, ` +
            `Secret Scanning: ${secretScanningResponse.data.length}`
          );

          // Return the fact result object for this repository
          // Use the entity's actual name, namespace, and kind from the catalog
          return {
            entity: {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            },
            facts: {
              openCodeScanningAlertCount: codeScanningResponse.data.length,
              openSecretScanningAlertCount: secretScanningResponse.data.length,
            },
          };
        } catch (err: any) {
          if (err.status === 403 || err.status === 404) {
            logger.warn(
              `⚠️ Access denied to security data for ${owner}/${repo} (status ${err.status}) — skipping`,
            );
            return null;
          }
          logger.error(
            `❌ Error fetching security data for ${owner}/${repo}: ${err.message} (status ${err.status})`,
          );
          return null;
        }
      }),
    );

    // Filter null results
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
};