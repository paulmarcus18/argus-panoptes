import {
  CompoundEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';

/**
 * Fetches SonarQube facts for a given entity using the Tech Insights API.
 * Returns the following metrics: bugs, code smells, vulnerabilities, code coverage, and quality gate status.
 *
 * @param api - The TechInsightsApi instance used to fetch facts.
 * @param entity - The entity reference for which to fetch SonarQube facts.
 * @returns An object containing SonarQube metrics for the entity.
 */
export const getSonarQubeFacts = async (
  api: TechInsightsApi,
  entity: CompoundEntityRef,
): Promise<{
  bugs: number;
  code_smells: number;
  vulnerabilities: number;
  code_coverage: number;	
  quality_gate: string;
}> => {
  try {
    // Log which entity is being queried
    console.log('Fetching SonarCloud facts for entity:', stringifyEntityRef(entity));

    // Fetch facts from the Tech Insights API for the given entity and retriever
    const response = await api.getFacts(entity, ['sonarcloud-fact-retriever']);

    // Log the raw response from the API for debugging
    console.log(
      'Raw Tech Insights API response:',
      JSON.stringify(response, null, 2),
    );

    // Extract the facts object from the response
    const facts = response?.['sonarcloud-fact-retriever']?.facts;

    // If no facts are found, log an error and return default values
    if (!facts) {
      console.error(
        'No facts found for entity:',
        stringifyEntityRef(entity),
      );
      return { bugs: 0, code_smells: 0, vulnerabilities: 0, code_coverage: 0, quality_gate: 'NONE' };
    }

    // Log the parsed facts for debugging
    console.log(
      'Parsed SonarCloud facts:', facts.bugs, facts.code_smells, facts.vulnerabilities, facts.code_coverage, facts.quality_gate
    );

    // Return the parsed facts, converting to appropriate types and providing defaults
    return {
      bugs: Number(facts.bugs ?? 0),
      code_smells: Number(facts.code_smells ?? 0),
      vulnerabilities: Number(facts.vulnerabilities ?? 0),
      code_coverage: Number(facts.code_coverage ?? 0),
      quality_gate: String(facts.quality_gate || 'NONE'),
    };
  } catch (error) {
    // Log any errors encountered during the fetch process
    console.error(
      'Error fetching SonarCloud facts for entity:',
      stringifyEntityRef(entity),
      error,
    );
    // Return default values if an error occurs
    return { bugs: 0, code_smells: 0, vulnerabilities: 0, code_coverage: 0, quality_gate: 'NONE' };
  }
};
