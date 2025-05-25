import {
    CompoundEntityRef,
    stringifyEntityRef} from '@backstage/catalog-model';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';
  
import { JsonObject } from '@backstage/types';
export type StatusColor = 'red' | 'yellow' | 'green' | 'gray';

/**
 * Interface defining the shape of GitHub security facts
 */
export interface GitHubSecurityFacts {
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
    criticalCheck: boolean;
    highCheck: boolean;
    mediumCheck: boolean;
    lowCheck: boolean;
    secretCheck: boolean;
  }
  
  /**
   * Function to fetch GitHub security facts for a given entity
   * @param api - TechInsightsApi instance
   * @param entity - The entity reference for which to fetch facts
   * @return A promise that resolves to an object containing GitHub security facts
   */
  export const getGitHubSecurityFacts = async (
    api: TechInsightsApi,
    entity: CompoundEntityRef,
  ): Promise<GitHubSecurityFacts> => {

    try {
      console.log(
        'Fetching GitHub Security facts for entity:',
        stringifyEntityRef(entity),
      );
      
      const response = await api.getFacts(entity, ['githubAdvancedSecurityFactRetriever']);
  
      // ------------------------------------------------
      // Facts checks
      const checkResults = await api.runChecks(entity);

      const secretCheck = checkResults.find(r => r.check.id === 'open-secret-scanning-alert-count');

      const criticalCheck = checkResults.find(r => r.check.id === 'critical-count');

      const highCheck = checkResults.find(r => r.check.id === 'high-count');

      const mediumCheck = checkResults.find(r => r.check.id === 'medium-count');

      const lowCheck = checkResults.find(r => r.check.id === 'low-count');


      // Log the results of the checks for debugging
      console.log("Result from secret checks🐴🦐:", secretCheck?.result);
      console.log("Result from secret medium:", mediumCheck?.result);
      console.log("Result from secret high:", highCheck?.result);
  
      // End of facts checks
      // -----------------------------------------------
      
      console.log(
        'Raw Tech Insights API response:',
        JSON.stringify(response, null, 2),
      );
      
      const facts = response?.['githubAdvancedSecurityFactRetriever']?.facts;

    //   const status = determineStatus(
    //     Boolean(criticalCheck?.result ?? false),
    //     Boolean(highCheck?.result ?? false),
    //     Boolean(mediumCheck?.result ?? false),
    //     Boolean(lowCheck?.result ?? false),
    //     Boolean(secretCheck?.result ?? false),
    //     Number(facts?.criticalCount ?? 0),
    //     Number(facts?.highCount ?? 0),
    //     Number(facts?.mediumCount ?? 0),
    //     Number(facts?.lowCount ?? 0),
    //     Number(facts?.openSecretScanningAlertCount ?? 0),
    //   );

      //console.log('Status:', status.color, status.summary);
      
      // Check if the facts are present and log an error if not
      if (!facts) {
        console.error(
          'No GitHub Security facts found for entity:',
          stringifyEntityRef(entity),
        );
        return {
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          openCodeScanningAlertCount: 0,
          openSecretScanningAlertCount: 0,
          codeScanningAlerts: {},
          secretScanningAlerts: {},
          criticalCheck: false,
          highCheck: false,
          mediumCheck: false,
          lowCheck: false,
          secretCheck: false,       
        };
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
        codeScanningAlerts: codeScanningAlerts as GitHubSecurityFacts['codeScanningAlerts'],
        secretScanningAlerts: secretScanningAlerts as GitHubSecurityFacts['secretScanningAlerts'],
        criticalCheck: Boolean(criticalCheck?.result ?? false),
        highCheck: Boolean(highCheck?.result ?? false),
        mediumCheck: Boolean(mediumCheck?.result ?? false),
        lowCheck: Boolean(lowCheck?.result ?? false),
        secretCheck: Boolean(secretCheck?.result ?? false),
      };
    } catch (error) {
      console.error(
        'Error fetching GitHub Security facts for entity:',
        stringifyEntityRef(entity),
        error,
      );
      return {
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        openCodeScanningAlertCount: 0,
        openSecretScanningAlertCount: 0,
        codeScanningAlerts: {},
        secretScanningAlerts: {},
        criticalCheck: false,
        highCheck: false,
        mediumCheck: false,
        lowCheck: false,
        secretCheck: false,
      };
    }
  };


  /**
   * Determines the status color and summary text based on metrics and check results
   * @param metrics - Security metrics object
   * @param secretChecksPassed - Boolean indicating if secret checks passed
   * @return Object with color and summary text
   */
  function determineStatus(
    criticalCheck: boolean,
    highCheck: boolean,
    mediumCheck: boolean,
    lowCheck: boolean,
    secretCheck: boolean,
    criticalCount: number,
    highCount: number,
    mediumCount: number,
    lowCount: number,
    secretCount: number,
  ): { color: StatusColor; summary: string } {
    // Determine color
    let color: StatusColor = 'green';
    let summary = 'No issues found.';
    
    if (highCheck || mediumCheck || lowCheck) {
      color = 'yellow';
      summary = `Issues found: ${highCount} high, ${mediumCount} medium, ${lowCount} low.`;
    }
    else if (criticalCheck || secretCheck) {
      color = 'red';
      summary = `Critical issues found: ${criticalCount} critical, ${secretCount} secret scanning alerts.`;
    } else {
      color = 'green';
      summary = 'All checks passed successfully.';
    }
    return { color, summary };
  }
  