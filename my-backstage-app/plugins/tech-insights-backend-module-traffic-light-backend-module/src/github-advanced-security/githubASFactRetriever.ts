/**
 * This file reads a GitHub token from config, uses Octokit to fetch GitHub Advanced Security data
 * Returns security findings in a structured way that Tech Insights can consume
 */
import { FactRetriever, TechInsightFact } from '@backstage-community/plugin-tech-insights-node';
import { CatalogClient } from '@backstage/catalog-client';
import { JsonObject, JsonValue } from '@backstage/types';

// Define interfaces for the security findings as JSON-compatible types
interface codeScanningFinding extends JsonObject {
  severity: string;
  description: string;
  direct_link: string;
  created_at: string;
}

// Dictionary structure for security findings where the key is the alert number/id
// Must be JsonObject compatible
interface codeScanningFindingsDict extends JsonObject {
  [alertId: string]: codeScanningFinding;
}

/**
 * This FactRetriever queries GitHub Advanced Security data for specified repositories
 * and returns detailed security findings for code scanning alerts and counts for secret scanning
 */
export const githubAdvancedSecurityFactRetriever: FactRetriever = {
  // Identifier for this fact retriever
  id: 'githubAdvancedSecurityFactRetriever',
  // Versioning information for this retriever
  version: '0.2.0',
  // Entity filter to specify which entities this retriever applies to
  entityFilter: [{ kind: 'component' }],
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
    secretScanningAlerts: {
      type: 'object',
      description: 'Dictionary of basic secret scanning findings keyed by alert ID',
    },
    codeScanningAlerts: {
      type: 'object',
      description: 'Dictionary of code scanning findings keyed by alert ID',
    },
  },

  // Main logic of the retriever
  async handler({ config, logger, entityFilter, auth, discovery }): Promise<TechInsightFact[]> {
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
          
          // Also fetch Secret Scanning alerts (just for count and descriptions)
          const secretScanningResponse = await octokit.request(
            'GET /repos/{owner}/{repo}/secret-scanning/alerts',
            {
              owner,
              repo,
              state: 'open',
              per_page: 100,
            },
          );

          // Process code scanning alerts to extract only the required information
          const codeScanningAlerts: codeScanningFindingsDict = {};
          
          codeScanningResponse.data.forEach(alert => {
            // Extract necessary information for code scanning alerts
            const alertId = `code-${alert.number}`;
            const instance = alert.most_recent_instance;
            const location = instance?.location;
            const start_line = location?.start_line || 1; // Default to line 1 if not provided
            
            // Create finding with only the requested fields
            const finding: codeScanningFinding = {
              severity: alert.rule?.security_severity_level || 'unknown',
              description: alert.rule?.description || alert.rule?.name || 'No description available',
              created_at: alert.created_at || '',
              direct_link: `https://github.com/${owner}/${repo}/blob/${instance?.commit_sha}/${location?.path}#L${start_line}`
            };
            
            // Add to dictionary with alert number as the key
            codeScanningAlerts[alertId] = finding;
          });

          // Process secret scanning alerts to create a dictionary with only the requested fields
          const secretScanningAlerts: codeScanningFindingsDict = {};
          
          secretScanningResponse.data.forEach(alert => {
            const alertId = `secret-${alert.number}`;
            
            // Create a simplified finding with just basic information
            secretScanningAlerts[alertId] = {
              severity: 'high', // Secret scanning alerts are typically high severity
              description: `Secret of type ${alert.secret_type || 'unknown'} found`,
              created_at: alert.created_at || '',
              direct_link: alert.html_url || ''
            };
          });

          logger.info(
            `📊 GitHub security metrics for ${owner}/${repo}: ` +
            `Code Scanning: ${Object.keys(codeScanningAlerts).length}, ` +
            `Secret Scanning: ${Object.keys(secretScanningAlerts).length}`
          );

          // Return the fact result object for this repository as a TechInsightFact
          return {
            entity: {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            },
            facts: {
              openCodeScanningAlertCount: Object.keys(codeScanningAlerts).length,
              openSecretScanningAlertCount: Object.keys(secretScanningAlerts).length,
              // Store alerts directly in the facts object
              codeScanningAlerts: codeScanningAlerts as JsonObject,
              secretScanningAlerts: secretScanningAlerts as JsonObject
            },
          } as TechInsightFact;
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

    // Filter null results and ensure they match TechInsightFact type
    return results.filter((r): r is TechInsightFact => r !== null);
  },
};