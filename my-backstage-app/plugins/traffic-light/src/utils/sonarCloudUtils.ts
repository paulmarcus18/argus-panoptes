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
 * A small utility for providing safe default objects when SonarCloud returns no data or an error is thrown.
 */
const DEFAULT_METRICS: SonarQubeMetrics = {
  bugs: 0,
  code_smells: 0,
  vulnerabilities: 0,
  code_coverage: 0,
  quality_gate: 'NONE',
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
  async getSonarQubeFacts(techInsightsApi: TechInsightsApi, entity: CompoundEntityRef): Promise<SonarQubeMetrics> {
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
}
