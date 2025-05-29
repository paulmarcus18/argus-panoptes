import {
  CompoundEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';

/**
 * Metrics returned by BlackDuck for a Backstage entity.
 */
export interface BlackDuckMetrics {
  security_risks_critical: number;
  security_risks_high: number;
  security_risks_medium: number;
}

/**
 * Results produced by running Tech Insights checks that map to BlackDuck rules.
 */
export interface BlackDuckChecks {
  criticalSecurityCheck: boolean;
  highSecurityCheck: boolean;
  mediumSecurityCheck: boolean;
}

/**
 * A small utility for providing safe default objects when BlackDuck returns no data or an error is thrown.
 */
const DEFAULT_METRICS: BlackDuckMetrics = {
  security_risks_critical: 0,
  security_risks_high: 0,
  security_risks_medium: 0,
};

const DEFAULT_CHECKS: BlackDuckChecks = {
  criticalSecurityCheck: false,
  highSecurityCheck: false,
  mediumSecurityCheck: false,
};

/**
 * Service‑style wrapper around the {@link TechInsightsApi} that exposes
 * methods for dealing with BlackDuck facts and checks.
 */
export class BlackDuckUtils {
  constructor() {}

  /**
   * Fetches BlackDuck facts for the provided entity.
   *
   * @param techInsightsApi – The TechInsightsApi instance used to fetch facts.
   * @param entity – The entity reference whose BlackDuck metrics should be retrieved.
   * @returns A {@link BlackDuckMetrics} object with the parsed results.
   */
  async getBlackDuckFacts(techInsightsApi: TechInsightsApi, entity: CompoundEntityRef): Promise<BlackDuckMetrics> {
    try {
      console.log(
        'Fetching BlackDuck facts for entity:',
        stringifyEntityRef(entity),
      );

      const response = await techInsightsApi.getFacts(entity, [
        'blackduck-fact-retriever',
      ]);

      console.log(
        'Raw Tech Insights API response:',
        JSON.stringify(response, null, 2),
      );

      const facts = response?.['blackduck-fact-retriever']?.facts;

      if (!facts) {
        console.error(
          'No BlackDuck facts found for entity:',
          stringifyEntityRef(entity),
        );
        return { security_risks_critical: 0, security_risks_high: 0, security_risks_medium: 0 };
      }

      console.log(
        'Parsed BlackDuck facts:',
        facts.security_risks_critical,
        facts.security_risks_high,
        facts.security_risks_medium,
      );

      return {
        security_risks_critical: Number(facts.security_risks_critical ?? 0),
        security_risks_high: Number(facts.security_risks_high ?? 0),
        security_risks_medium: Number(facts.security_risks_medium ?? 0),
      };
    } catch (error) {
      console.error(
        'Error while fetching BlackDuck facts for entity:',
        stringifyEntityRef(entity),
        error,
      );
      return { ...DEFAULT_METRICS };
    }
  }

  /**
   * Executes the BlackDuck‑related Tech Insights checks for the supplied entity.
   *
   * @param techInsightsApi – The TechInsightsApi instance for fetching checks.
   * @param entity – The entity reference for which to run the checks.
   * @returns A {@link BlackDuckChecks} object containing boolean results for each check.
   */
  async getBlackDuckChecks(techInsightsApi: TechInsightsApi, entity: CompoundEntityRef): Promise<BlackDuckChecks> {
    try {
      console.log(
        'Running BlackDuck checks for entity:',
        stringifyEntityRef(entity),
      );
      const checkResults = await techInsightsApi.runChecks(entity);

      // Extract the results of each checks
      const criticalSecurityCheck = checkResults.find(r => r.check.id === 'blackduck-critical-security-risk');
      const highSecurityCheck = checkResults.find(r => r.check.id === 'blackduck-high-security-risk');
      const mediumSecurityCheck = checkResults.find(r => r.check.id === 'blackduck-medium-security-risk');
      
      // Log the results of the checks for debugging
      console.log("Result from critical security checks for entity:", stringifyEntityRef(entity), criticalSecurityCheck?.result);
      console.log("Result from high security checks for entity:", stringifyEntityRef(entity), highSecurityCheck?.result);
      console.log("Result from medium security checks for entity:", stringifyEntityRef(entity), mediumSecurityCheck?.result);

      // If no check results are found, log an error and return default values
      if (checkResults.length === 0) {
        console.error(
          'No checks found for entity:',
          stringifyEntityRef(entity),
        );
        return { ...DEFAULT_CHECKS };
      }

      // Return the parsed facts, converting to appropriate types and providing defaults
      return {
          criticalSecurityCheck: criticalSecurityCheck?.result === true,
          highSecurityCheck: highSecurityCheck?.result === true,
          mediumSecurityCheck: mediumSecurityCheck?.result === true,
      };
    } catch (error) {
      // Log any errors encountered during the fetch process
      console.error(
        'Error fetching BlackDuck checks for entity:',
        stringifyEntityRef(entity),
        error,
      );
      // Return default values if an error occurs
      return { ...DEFAULT_CHECKS };
    }
  }
}
