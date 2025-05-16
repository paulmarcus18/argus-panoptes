import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { Entity } from '@backstage/catalog-model';
// Import the existing types from your utils file instead of redefining them
import { getGitHubSecurityFacts, GitHubSecurityFacts } from '../utils';

// ---------------------- Type Definitions ----------------------

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type StatusColor = 'red' | 'yellow' | 'green' | 'gray';

export interface IssueDetail {
  severity: Severity;
  description: string;
  directLink?: string;
  created_at?: string;
  component?: string; 
}

export interface SecurityMetrics {
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  totalCodeScanningAlerts: number;
  totalSecretScanningAlerts: number;
}

export interface GitHubSecurityData {
  color: StatusColor;
  metrics: SecurityMetrics;
  summary: string;
  details: IssueDetail[];
}

export interface EntityRef {
  kind: string;
  namespace: string;
  name: string;
}

// ---------------------- Utility Functions ----------------------

/**
 * Creates an entity reference object from an Entity
 * @param entity - The entity to create a reference for
 */
export const createEntityRef = (entity: Entity): EntityRef => ({
  kind: entity.kind,
  namespace: entity.metadata.namespace || 'default',
  name: entity.metadata.name,
});

/**
 * Extracts repository name and file path from a GitHub direct link
 * @param directLink - The direct link to the file
 * @return An object containing the repository name and file path so 
 * the user can see it in the issues description
 */
export const extractInfoFromDirectLink = (directLink: string): { repoName: string; filePath: string } => {
  if (!directLink) {
    return { repoName: '', filePath: '' };
  }
  // Extraction logic for repo name and file path from url stored
  try {
    const url = new URL(directLink);
    const pathParts = url.pathname.split('/');
    
    if (url.hostname === 'github.com' && pathParts.length >= 5) {
      const repoName = `${pathParts[1]}/${pathParts[2]}`;
      let filePath = '';
      
      if (pathParts[3] === 'blob' && pathParts.length > 5) {
        filePath = pathParts.slice(5).join('/');
      }
      
      return { repoName, filePath };
    }
  } catch (e) {
    console.error('Failed to parse direct_link:', e);
  }
  
  return { repoName: '', filePath: '' };
};

/**
 * Creates a default empty security metrics object
 */
export const createEmptyMetrics = (): SecurityMetrics => ({
  totalIssues: 0,
  criticalIssues: 0,
  highIssues: 0,
  mediumIssues: 0,
  lowIssues: 0,
  totalCodeScanningAlerts: 0,
  totalSecretScanningAlerts: 0,
});

/**
 * Creates a default security data object for error handling
 */
export const createDefaultSecurityData = (): GitHubSecurityData => ({
  color: 'gray',
  metrics: createEmptyMetrics(),
  summary: 'Failed to load GitHub Advanced Security data.',
  details: [],
});

/**
 * Sorts issues by severity (critical > high > medium > low)
 * @param issues - Array of issue details
 * @return Sorted array of issue details so that the user can see the issues sorted
 */
export const sortIssuesBySeverity = (issues: IssueDetail[]): IssueDetail[] => {
  const severityOrder: Record<Severity, number> = { 
    critical: 4, 
    high: 3, 
    medium: 2, 
    low: 1 
  };
  
  return [...issues].sort((a, b) => 
    (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0)
  );
};

// ---------------------- Core Processing Functions ----------------------

/**
 * Fetches GitHub security facts for all entities
 * @param techInsightsApi - Backstage tech insights API
 * @param entities - Catalog entities to process
 * @return Promise with GitHub security facts
 */
async function fetchSecurityData(
  techInsightsApi: typeof techInsightsApiRef.T,
  entities: Entity[]
): Promise<GitHubSecurityFacts[]> {
  return Promise.all(
    entities.map(entity => 
      getGitHubSecurityFacts(techInsightsApi, createEntityRef(entity))
    )
  );
}

/**
 * Checks if security requirements are met using the tech insights check system
 * @param techInsightsApi - Backstage tech insights API
 * @param entities - Catalog entities to process
 * @return Boolean indicating if there are secret scaning issues
 */
async function checkSecurityRequirements(
  techInsightsApi: typeof techInsightsApiRef.T,
  entities: Entity[]
): Promise<boolean> {
  if (!entities.length) {
    return true;
  }
  
  try {
    const entity = entities[0]; // Use the first entity as representative
    const entityRef = createEntityRef(entity);
    
    const checkResults = await techInsightsApi.runChecks(entityRef);
    const secretCheck = checkResults.find(r => r.check.id === 'githubSecretScanningCheck');
    
    // If secretCheck result is false, the check failed
    if (secretCheck !== undefined && secretCheck.result === false) {
      console.log("Secret scanning check failed");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error checking security requirements:", error);
    return true; // Default to passed on error
  }
}

/**
 * Processes code scanning alerts and counts issues by severity
 * @param securityResults - Array of GitHub security facts
 * @return Object containing issue details and severity counts
 */
function processCodeScanningAlerts(securityResults: GitHubSecurityFacts[]): {
  issueDetails: IssueDetail[];
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
} {
  const issueDetails: IssueDetail[] = [];
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
  
  securityResults.forEach(result => {
    if (!result.codeScanningAlerts) {
      return;
    }
    
    Object.values(result.codeScanningAlerts).forEach(alert => {
      const severityLower = alert.severity.toLowerCase();
      
      // Count by severity
      switch(severityLower) {
        case 'critical':
          severityCounts.critical++;
          break;
        case 'high':
          severityCounts.high++;
          break;
        case 'medium':
          severityCounts.medium++;
          break;
        case 'low':
          severityCounts.low++;
          break;
        default:
          // Default to medium if severity is unknown
          severityCounts.medium++;
      }
      
      // Extract repository and file info
      const { repoName, filePath } = extractInfoFromDirectLink(alert.direct_link || '');
      
      // Format description
      const description = repoName 
        ? `[${repoName}] ${alert.description}` 
        : alert.description;
      
      // Add to details
      issueDetails.push({
        severity: (severityLower as Severity) || 'medium',
        description,
        directLink: alert.direct_link,
        created_at: alert.created_at,
        component: filePath || undefined,
      });
    });
  });
  
  return { issueDetails, severityCounts };
}

/**
 * Processes secret scanning alerts
 * @param securityResults - Array of GitHub security facts
 * @return Object containing issue details and their count
 */
function processSecretScanningAlerts(securityResults: GitHubSecurityFacts[]): {
  issueDetails: IssueDetail[];
  count: number;
} {
  const issueDetails: IssueDetail[] = [];
  let count = 0;
  
  securityResults.forEach(result => {
    if (!result.secretScanningAlerts) {
      return;
    }
    
    Object.values(result.secretScanningAlerts).forEach(alert => {
      count++; // Increment high severity issues
      
      // Extract repository info
      const { repoName } = extractInfoFromDirectLink(alert.html_url || '');
      
      // Format description
      const description = repoName 
        ? `[${repoName}] ${alert.description}` 
        : alert.description;
      
      issueDetails.push({
        severity: 'high',
        description,
        directLink: alert.html_url || '',
        created_at: alert.created_at
      });
    });
  });
  
  return { issueDetails, count };
}

/**
 * Calculates aggregate metrics from security results
 * @param securityResults - Array of GitHub security facts
 * @param codeScanningCounts - Object with counts of issues by severity
 * @param secretScanningCount - Count of secret scanning issues
 * @return SecurityMetrics object with total issues and counts
 */
function calculateMetrics(
  securityResults: GitHubSecurityFacts[],
  codeScanningCounts: { critical: number; high: number; medium: number; low: number },
  secretScanningCount: number
): SecurityMetrics {
  const totalCodeScanningAlerts = securityResults.reduce(
    (sum, result) => sum + result.openCodeScanningAlertCount, 0
  );
  
  const totalSecretScanningAlerts = securityResults.reduce(
    (sum, result) => sum + result.openSecretScanningAlertCount, 0
  );
  
  return {
    totalIssues: totalCodeScanningAlerts + totalSecretScanningAlerts,
    criticalIssues: codeScanningCounts.critical,
    highIssues: codeScanningCounts.high + secretScanningCount,
    mediumIssues: codeScanningCounts.medium,
    lowIssues: codeScanningCounts.low,
    totalCodeScanningAlerts,
    totalSecretScanningAlerts,
  };
}

/**
 * Determines the status color and summary text based on metrics and check results
 * @param metrics - Security metrics object
 * @param secretChecksPassed - Boolean indicating if secret checks passed
 * @return Object with color and summary text
 */
function determineStatus(
  metrics: SecurityMetrics, 
  secretChecksPassed: boolean
): { color: StatusColor; summary: string } {
  // Determine color
  let color: StatusColor = 'green';
  
  if (metrics.criticalIssues > 0 || metrics.highIssues > 0 || !secretChecksPassed) {
    color = 'red';
  } else if (metrics.mediumIssues > 0) {
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
  
  return { color, summary };
}

// ---------------------- Main Processing Function ----------------------

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
    // Run checks and fetch data in parallel
    const [secretChecksPassed, securityResults] = await Promise.all([
      checkSecurityRequirements(techInsightsApi, entities),
      fetchSecurityData(techInsightsApi, entities)
    ]);
    
    // Process alerts
    const { issueDetails: codeScanningIssues, severityCounts } = 
      processCodeScanningAlerts(securityResults);
    
    const { issueDetails: secretScanningIssues, count: secretIssuesCount } = 
      processSecretScanningAlerts(securityResults);
    
    // Calculate metrics
    const metrics = calculateMetrics(
      securityResults, 
      severityCounts, 
      secretIssuesCount
    );
    
    // Determine status color and summary
    const { color, summary } = determineStatus(metrics, secretChecksPassed);
    
    // Combine and sort all issue details
    const allIssues = [...codeScanningIssues, ...secretScanningIssues];
    const sortedIssues = sortIssuesBySeverity(allIssues);
    
    // Return the processed data
    return {
      color,
      metrics,
      summary,
      details: sortedIssues,
    };
  } catch (error) {
    console.error('Error processing GitHub Security data:', error);
    return createDefaultSecurityData();
  }
}