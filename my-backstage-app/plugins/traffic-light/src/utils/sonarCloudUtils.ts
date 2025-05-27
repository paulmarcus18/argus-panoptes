import {
  CompoundEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';

/**
 * Metrics returned by SonarCloud for a Backstage entity.
 */
export interface SonarQubeMetrics {
  bugs: number;
  code_smells: number;
  vulnerabilities: number;
  code_coverage: number;
  quality_gate: string;
}

/**
 * Results produced by running Tech Insights checks that map to SonarCloud rules.
 */
export interface SonarQubeChecks {
  bugsCheck: boolean;
  vulnerabilitiesCheck: boolean;
  codeSmellsCheck: boolean;
  qualityGateCheck: boolean;
  codeCoverageCheck: boolean;
}

/**
 * A small utility for providing safe default objects when SonarCloud returns no data or an error is thrown.
 */
const DEFAULT_METRICS: SonarQubeMetrics = {
  bugs: 0,
  code_smells: 0,
  vulnerabilities: 0,
  code_coverage: 0,
  quality_gate: 'NONE',
};

const DEFAULT_CHECKS: SonarQubeChecks = {
  bugsCheck: false,
  vulnerabilitiesCheck: false,
  codeSmellsCheck: false,
  qualityGateCheck: false,
  codeCoverageCheck: false,
};

/**
 * Service‑style wrapper around the {@link TechInsightsApi} that exposes
 * methods for dealing with SonarCloud facts and checks.
 */
export class SonarCloudUtils {
  constructor() {}

  /**
   * Fetches SonarCloud facts for the provided entity.
   *
   * @param techInsightsApi – The TechInsightsApi instance used to fetch facts.
   * @param entity – The entity reference whose SonarCloud metrics should be retrieved.
   * @returns A {@link SonarQubeMetrics} object with the parsed results.
   */
   async  getSonarQubeFacts(techInsightsApi: TechInsightsApi, entity: CompoundEntityRef): Promise<SonarQubeMetrics> {
    try {
      console.log(
        'Fetching SonarCloud facts for entity:',
        stringifyEntityRef(entity),
      );

      const response = await techInsightsApi.getFacts(entity, [
        'sonarcloud-fact-retriever',
      ]);

      console.log(
        'Raw Tech Insights API response:',
        JSON.stringify(response, null, 2),
      );

      const facts = response?.['sonarcloud-fact-retriever']?.facts;

      if (!facts) {
        console.error(
          'No SonarCloud facts found for entity:',
          stringifyEntityRef(entity),
        );
        return { bugs: 0, code_smells: 0, vulnerabilities: 0, code_coverage: 0, quality_gate: 'NONE' };
      }

      console.log(
        'Parsed SonarCloud facts:',
        facts.bugs,
        facts.code_smells,
        facts.vulnerabilities,
        facts.code_coverage,
        facts.quality_gate,
      );

      return {
        bugs: Number(facts.bugs ?? 0),
        code_smells: Number(facts.code_smells ?? 0),
        vulnerabilities: Number(facts.vulnerabilities ?? 0),
        code_coverage: Number(facts.code_coverage ?? 0),
        quality_gate: String(facts.quality_gate ?? 'NONE'),
      };
    } catch (error) {
      console.error(
        'Error while fetching SonarCloud facts for entity:',
        stringifyEntityRef(entity),
        error,
      );
      return { ...DEFAULT_METRICS };
    }
  }

  /**
   * Executes the SonarCloud‑related Tech Insights checks for the supplied entity.
   *
   * @param techInsightsApi – The TechInsightsApi instance for fetching checks.
   * @param entity – The entity reference for which to run the checks.
   * @returns A {@link SonarQubeChecks} object containing boolean results for each check.
   */
  async getSonarQubeChecks(techInsightsApi: TechInsightsApi, entity: CompoundEntityRef): Promise<SonarQubeChecks> {
    try {
      console.log(
        'Running SonarCloud checks for entity:',
        stringifyEntityRef(entity),
      );
      const checkResults = await techInsightsApi.runChecks(entity);

      // Extract the results of each checks
      const bugsCheck = checkResults.find(r => r.check.id === 'sonarcloud-bugs');
      const vulnerabilitiesCheck = checkResults.find(r => r.check.id === 'sonarcloud-vulnerabilities');
      const codeSmellsCheck = checkResults.find(r => r.check.id === 'sonarcloud-code-smells');
      const qualityGateCheck = checkResults.find(r => r.check.id === 'sonarcloud-quality-gate');
      const codeCoverageCheck = checkResults.find(r => r.check.id === 'sonarcloud-code-coverage');
      
      // Log the results of the checks for debugging
      console.log("Result from Bugs checks for entity:", stringifyEntityRef(entity), bugsCheck?.result);
      console.log("Result from Vulnerabilities checks for entity:", stringifyEntityRef(entity), vulnerabilitiesCheck?.result);
      console.log("Result from Code Smells checks for entity:", stringifyEntityRef(entity), codeSmellsCheck?.result);
      console.log("Result from Quality Gate checks for entity:", stringifyEntityRef(entity),  qualityGateCheck?.result);
      console.log("Result from Code Coverage checks for entity:", stringifyEntityRef(entity), codeCoverageCheck?.result);

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
          bugsCheck: bugsCheck?.result === true,
          vulnerabilitiesCheck: vulnerabilitiesCheck?.result === true,
          codeSmellsCheck: codeSmellsCheck?.result === true,
          qualityGateCheck: qualityGateCheck?.result === true,
          codeCoverageCheck: codeCoverageCheck?.result === true,
      };
    } catch (error) {
      // Log any errors encountered during the fetch process
      console.error(
        'Error fetching SonarCloud checks for entity:',
        stringifyEntityRef(entity),
        error,
      );
      // Return default values if an error occurs
      return { ...DEFAULT_CHECKS };
    }
  }
}
