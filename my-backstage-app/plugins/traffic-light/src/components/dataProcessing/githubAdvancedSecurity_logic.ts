import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { Entity } from '@backstage/catalog-model';
import { getGitHubSecurityFacts } from '../utils';

// Type for semaphore severity
export type Severity = 'critical' | 'high' | 'medium' | 'low';

// Type definitions for GitHub security alerts
export interface CodeScanningAlert {
  number: number;
  created_at: string;
  direct_link?: string;
  description: string;
  severity: string;
}

export interface SecretScanningAlert {
  number: number;
  created_at: string;
  html_url?: string;
  description: string;
}

// Interface for GitHub security facts general
export interface GitHubSecurityFacts {
  openCodeScanningAlertCount: number;
  openSecretScanningAlertCount: number;
  codeScanningAlerts?: Record<string, CodeScanningAlert>;
  secretScanningAlerts?: Record<string, SecretScanningAlert>;
}

// Type for issue details
export interface IssueDetail {
  severity: Severity;
  description: string;
  directLink?: string;
  created_at?: string;
  component?: string; // Extracted from direct_link if possible
}

// Types for metrics data
export interface GitHubSecurityData {
  color: 'red' | 'yellow' | 'green' | 'gray';
  metrics: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    totalCodeScanningAlerts: number;
    totalSecretScanningAlerts: number;
  };
  summary: string;
  details: IssueDetail[];
}

/**
 * This function extracts the repository name and file path from a GitHub direct link.
 * @param directLink - The direct link to the GitHub file
 * @returns repository name and the link to the issue
 */
export const extractInfoFromDirectLink = (directLink: string): { repoName: string; filePath: string } => {
  const result = { repoName: '', filePath: '' };
  
  if (!directLink) return result;
  
  try {
    // Format is usually: https://github.com/{owner}/{repo}/blob/{commit}/{path}#L{line}
    const url = new URL(directLink);
    const pathParts = url.pathname.split('/');
    
    if (url.hostname === 'github.com' && pathParts.length >= 5) {
      // Extract owner/repo
      result.repoName = `${pathParts[1]}/${pathParts[2]}`;
      
      // Extract file path - everything after the /blob/{commit}/ part
      if (pathParts[3] === 'blob' && pathParts.length > 5) {
        result.filePath = pathParts.slice(5).join('/');
      }
    }
  } catch (e) {
    // If URL parsing fails, return empty strings
    console.error('Failed to parse direct_link:', e);
  }
  
  return result;
};

/**
 * Process GitHub security data for multiple entities
 * @param techInsightsApi - Backstage tech insights API
 * @param entities - Catalog entities to process
 * @returns Promise with processed GitHub security data
 */
export async function processGitHubSecurityData(
    techInsightsApi: typeof techInsightsApiRef.T, 
    entities: Entity[]
  ): Promise<GitHubSecurityData> {
    try {
      // Get GitHub security facts for all entities
      const securityResults = await Promise.all(
        entities.map(entity =>
          getGitHubSecurityFacts(techInsightsApi, {
            kind: entity.kind,
            namespace: entity.metadata.namespace || 'default',
            name: entity.metadata.name,
          }),
        ),
      );
  
      // ------------------------------------------------
      // Run fact check - using the first entity as representative
      // If you need to check all entities, you would need to loop through them
      let secretChecksPassed = true;
      
      if (entities.length > 0) {
        const entity = entities[0]; // Use the first entity
        const entityRef = {
          kind: entity.kind,
          namespace: entity.metadata.namespace || 'default',
          name: entity.metadata.name,
        };
        
        const checkResults = await techInsightsApi.runChecks(entityRef);
        const secretCheck = checkResults.find(r => r.check.id === 'githubSecretScanningCheck');
        
        // If secretCheck result is false, the check failed
        // If secretCheck is undefined, we assume it passed (no check defined)
        if (secretCheck !== undefined && secretCheck.result === false) {
          secretChecksPassed = false;
          console.log("Secret scanning check failed");
        }
      }
      
      // End of facts checks
      // -----------------------------------------------
  
      // Process the results to categorize findings by severity
      let criticalIssues = 0;
      let highIssues = 0;
      let mediumIssues = 0;
      let lowIssues = 0;
      
      // Collect all issues for details section
      const details: IssueDetail[] = [];
  
      securityResults.forEach(result => {
        // Process code scanning alerts
        if (result.codeScanningAlerts) {
          Object.values(result.codeScanningAlerts).forEach((alert) => {
            // Count by severity
            switch(alert.severity.toLowerCase()) {
              case 'critical':
                criticalIssues++;
                break;
              case 'high':
                highIssues++;
                break;
              case 'medium':
                mediumIssues++;
                break;
              case 'low':
                lowIssues++;
                break;
              default:
                // Default to medium if severity is unknown
                mediumIssues++;
            }
  
            // Extract repository and file info from direct_link
            const { repoName, filePath } = extractInfoFromDirectLink(alert.direct_link || '');
            
            // Add repository name to description if available
            let description = alert.description;
            if (repoName) {
              description = `[${repoName}] ${description}`;
            }
  
            // Add to details
            details.push({
              severity: (alert.severity.toLowerCase() as Severity) || 'medium',
              description: description,
              directLink: alert.direct_link,
              created_at: alert.created_at,
              component: filePath || undefined, // Use file path as component if available
            });
          });
        }
  
        // Process secret scanning alerts (most secret scanning alerts are high severity)
        if (result.secretScanningAlerts) {
          Object.values(result.secretScanningAlerts).forEach((alert) => {
            highIssues++; // Most secret alerts are high severity
            
            // Extract repository info from direct_link
            const { repoName } = extractInfoFromDirectLink(alert.html_url || '');
            
            // Add repository name to description if available
            let description = alert.description;
            if (repoName) {
              description = `[${repoName}] ${description}`;
            }
            
            details.push({
              severity: 'high',
              description: description,
              directLink: alert.html_url || '',
              created_at: alert.created_at
            });
          });
        }
      });
  
      // Calculate total issues
      const totalCodeScanningAlerts = securityResults.reduce(
        (sum, result) => sum + result.openCodeScanningAlertCount, 0
      );
      const totalSecretScanningAlerts = securityResults.reduce(
        (sum, result) => sum + result.openSecretScanningAlertCount, 0
      );
      const totalIssues = totalCodeScanningAlerts + totalSecretScanningAlerts;
  
      // Determine color based on the presence of issues and fact check results
      let color: 'red' | 'yellow' | 'green' | 'gray' = 'green';
      
      // Set to red if either there are critical/high issues OR the secret check failed
      if (criticalIssues > 0 || highIssues > 0 || !secretChecksPassed) {
        color = 'red';
      } else if (mediumIssues > 0) {
        color = 'yellow';
      }
  
      // Create summary
      let summary = 'No security issues found.';
      if (color === 'red') {
        if (!secretChecksPassed) {
          summary = 'Secret scanning check failed. Security issues require immediate attention.';
        } else {
          summary = 'Security issues require immediate attention.';
        }
      } else if (color === 'yellow') {
        summary = 'Security issues need to be addressed.';
      }
  
      // Return the processed data
      return {
        color,
        metrics: {
          totalIssues,
          criticalIssues,
          highIssues,
          mediumIssues,
          lowIssues,
          totalCodeScanningAlerts,
          totalSecretScanningAlerts,
        },
        summary,
        details: details.sort((a, b) => {
          // Sort by severity (critical > high > medium > low)
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        }),
      };
    } catch (err) {
      console.error('Error processing GitHub Security data:', err);
      
      // Return default data in case of error
      return {
        color: 'gray',
        metrics: {
          totalIssues: 0,
          criticalIssues: 0,
          highIssues: 0,
          mediumIssues: 0,
          lowIssues: 0,
          totalCodeScanningAlerts: 0,
          totalSecretScanningAlerts: 0,
        },
        summary: 'Failed to load GitHub Advanced Security data.',
        details: [],
      };
    }
  }
