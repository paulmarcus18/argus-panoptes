import {
  CompoundEntityRef,
  stringifyEntityRef
} from '@backstage/catalog-model';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';
import { JsonObject } from '@backstage/types';

/**
 * Helper union used to type the possible status colours.
 */
export type StatusColor = 'red' | 'yellow' | 'green' | 'gray';

/**
 * Interface defining the shape of raw GitHub security facts (without checks)
 */
export interface GitHubSecurityRawFacts {
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  openCodeScanningAlertCount: number;
  openSecretScanningAlertCount: number;
  codeScanningAlerts: Record<string, {
    severity: string;
    description: string;
    direct_link?: string;
    created_at: string;
  }>;
  secretScanningAlerts: Record<string, {
    severity: string;
    description: string;
    html_url: string;
    created_at: string;
  }>;
}

/**
 * Interface defining the shape of GitHub security facts including checks
 */
export interface GitHubSecurityFacts extends GitHubSecurityRawFacts {
  criticalCheck: boolean;
  highCheck: boolean;
  mediumCheck: boolean;
  lowCheck: boolean;
  secretCheck: boolean;
}

/**
 * The boolean outcomes of the checks.
 */
export interface GitHubSecurityChecks {
  criticalCheck: boolean;
  highCheck: boolean;
  mediumCheck: boolean;
  lowCheck: boolean;
  secretCheck: boolean;
}

const DEFAULT_RAW_FACTS: GitHubSecurityRawFacts = {
  criticalCount: 0,
  highCount: 0,
  mediumCount: 0,
  lowCount: 0,
  openCodeScanningAlertCount: 0,
  openSecretScanningAlertCount: 0,
  codeScanningAlerts: {},
  secretScanningAlerts: {},
};

const DEFAULT_CHECKS: GitHubSecurityChecks = {
  criticalCheck: false,
  highCheck: false,
  mediumCheck: false,
  lowCheck: false,
  secretCheck: false,
};

const DEFAULT_FACTS: GitHubSecurityFacts = {
  ...DEFAULT_RAW_FACTS,
  ...DEFAULT_CHECKS,
};

/**
 * Class‑based wrapper around {@link TechInsightsApi} that exposes typed helper
 * methods for GitHub Advanced Security facts & checks.
 */
export class GithubAdvancedSecurityUtils {
  constructor() {}

  /**
   * Function to fetch raw GitHub security facts for a given entity (without running checks)
   * @param api - TechInsightsApi instance
   * @param entity - The entity reference for which to fetch facts
   * @return A promise that resolves to an object containing raw GitHub security facts
   */
  async getRawGitHubSecurityFacts(
    api: TechInsightsApi, 
    entity: CompoundEntityRef
  ): Promise<GitHubSecurityRawFacts> {
    try {
      console.log(
        'Fetching raw GitHub Security facts for entity:',
        stringifyEntityRef(entity),
      );

      const response = await api.getFacts(entity, ['githubAdvancedSecurityFactRetriever']);

      console.log(
        'Raw Tech Insights API response:',
        JSON.stringify(response, null, 2),
      );

      const facts = response?.['githubAdvancedSecurityFactRetriever']?.facts;

      // Check if the facts are present and log an error if not
      if (!facts) {
        console.error(
          'No GitHub Security facts found for entity:',
          stringifyEntityRef(entity),
        );
        return { ...DEFAULT_RAW_FACTS };
      }

      // Type assertion to handle the JSON types correctly
      const codeScanningAlerts = (facts.codeScanningAlerts as JsonObject) || {};
      const secretScanningAlerts = (facts.secretScanningAlerts as JsonObject) || {};

      return {
        criticalCount: Number(facts.criticalCount ?? 0),
        highCount: Number(facts.highCount ?? 0),
        mediumCount: Number(facts.mediumCount ?? 0),
        lowCount: Number(facts.lowCount ?? 0),
        openCodeScanningAlertCount: Number(facts.openCodeScanningAlertCount ?? 0),
        openSecretScanningAlertCount: Number(facts.openSecretScanningAlertCount ?? 0),
        // Cast to the expected types 
        codeScanningAlerts: codeScanningAlerts as GitHubSecurityRawFacts['codeScanningAlerts'],
        secretScanningAlerts: secretScanningAlerts as GitHubSecurityRawFacts['secretScanningAlerts'],
      };
    } catch (error) {
      console.error(
        'Error fetching raw GitHub Security facts for entity:',
        stringifyEntityRef(entity),
        error,
      );
      return { ...DEFAULT_RAW_FACTS };
    }
  }

  /**
   * Function to run GitHub security checks for a given entity
   * @param api - TechInsightsApi instance
   * @param entity - The entity reference for which to run checks
   * @return A promise that resolves to an object containing check results
   */
  async runGitHubSecurityChecks(
    api: TechInsightsApi, 
    entity: CompoundEntityRef
  ): Promise<GitHubSecurityChecks> {
    try {
      console.log(
        'Running GitHub Security checks for entity:',
        stringifyEntityRef(entity),
      );

      const checkResults = await api.runChecks(entity);

      // Find specific check results
      const secretCheck = checkResults.find(r => r.check.id === 'open-secret-scanning-alert-count');
      const criticalCheck = checkResults.find(r => r.check.id === 'critical-count');
      const highCheck = checkResults.find(r => r.check.id === 'high-count');
      const mediumCheck = checkResults.find(r => r.check.id === 'medium-count');
      const lowCheck = checkResults.find(r => r.check.id === 'low-count');

      // Log the results of the checks for debugging
      console.log("Result from secret checks:", secretCheck?.result);
      console.log("Result from critical check:", criticalCheck?.result);
      console.log("Result from high check:", highCheck?.result);
      console.log("Result from medium check:", mediumCheck?.result);
      console.log("Result from low check:", lowCheck?.result);

      return {
        criticalCheck: Boolean(criticalCheck?.result ?? false),
        highCheck: Boolean(highCheck?.result ?? false),
        mediumCheck: Boolean(mediumCheck?.result ?? false),
        lowCheck: Boolean(lowCheck?.result ?? false),
        secretCheck: Boolean(secretCheck?.result ?? false),
      };
    } catch (error) {
      console.error(
        'Error running GitHub Security checks for entity:',
        stringifyEntityRef(entity),
        error,
      );
      return { ...DEFAULT_CHECKS };
    }
  }

  /**
   * Function to fetch complete GitHub security facts including checks for a given entity
   * @param api - TechInsightsApi instance
   * @param entity - The entity reference for which to fetch facts and run checks
   * @return A promise that resolves to an object containing GitHub security facts and check results
   */
  async getGitHubSecurityFacts(
    api: TechInsightsApi, 
    entity: CompoundEntityRef
  ): Promise<GitHubSecurityFacts> {
    try {
      console.log(
        'Fetching complete GitHub Security facts and checks for entity:',
        stringifyEntityRef(entity),
      );

      // Run both operations in parallel for better performance
      const [rawFacts, checks] = await Promise.all([
        this.getRawGitHubSecurityFacts(api, entity),
        this.runGitHubSecurityChecks(api, entity),
      ]);

      return {
        ...rawFacts,
        ...checks,
      };
    } catch (error) {
      console.error(
        'Error fetching complete GitHub Security facts for entity:',
        stringifyEntityRef(entity),
        error,
      );
      return { ...DEFAULT_FACTS };
    }
  }

  /**
   * Helper method to determine if any critical or high severity issues exist
   * @param facts - The GitHub security facts
   * @return Boolean indicating if there are critical security issues
   */
  hasCriticalSecurityIssues(facts: GitHubSecurityFacts): boolean {
    return facts.criticalCount > 0 || facts.highCount > 0 || facts.openSecretScanningAlertCount > 0;
  }

  /**
   * Helper method to get a summary of security issues
   * @param facts - The GitHub security facts
   * @return String summary of security issues
   */
  getSecuritySummary(facts: GitHubSecurityFacts): string {
    const issues = [];
    
    if (facts.criticalCount > 0) {
      issues.push(`${facts.criticalCount} critical`);
    }
    if (facts.highCount > 0) {
      issues.push(`${facts.highCount} high`);
    }
    if (facts.mediumCount > 0) {
      issues.push(`${facts.mediumCount} medium`);
    }
    if (facts.lowCount > 0) {
      issues.push(`${facts.lowCount} low`);
    }
    if (facts.openSecretScanningAlertCount > 0) {
      issues.push(`${facts.openSecretScanningAlertCount} secrets`);
    }

    return issues.length > 0 ? `Found: ${issues.join(', ')} severity issues` : 'No security issues found';
  }
}