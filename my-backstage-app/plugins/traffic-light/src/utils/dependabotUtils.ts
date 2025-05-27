import {
  CompoundEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';

/**
 * Fetches Dependabot facts for a given entity using the Tech Insights API.
 * Returns metrics like total alert counts per severity.
 *
 * @param api - The TechInsightsApi instance used to fetch facts.
 * @param entity - The entity reference for which to fetch Dependabot facts.
 */
export const getDependabotFacts = async (
  api: TechInsightsApi,
  entity: CompoundEntityRef,
): Promise<{
    criticalAlertsCount: number;
    highAlertsCount: number;    
    mediumAlertsCount: number;
}> => {
  try {
    console.log(
      'Fetching Dependabot facts for entity:',
      stringifyEntityRef(entity),
    );

    const response = await api.getFacts(entity, [
      'DependabotFactRetriever',
    ]);

    console.log(
      'Raw Tech Insights API response:',
      JSON.stringify(response, null, 2),
    );

    const facts = response?.['DependabotFactRetriever']?.facts;

    if (!facts) {
      console.error('No facts found for entity:', stringifyEntityRef(entity));
      return {
        criticalAlertsCount: 0,
        highAlertsCount: 0,
        mediumAlertsCount: 0,
      };
    }

    console.log(
      'Parsed Dependabot facts:',
        facts.criticalAlertsCount,  
        facts.highAlertsCount,
        facts.mediumAlertsCount,
    );

    return {
        criticalAlertsCount: Number(facts.criticalAlertsCount ?? 0),
        highAlertsCount: Number(facts.highAlertsCount ?? 0),    
        mediumAlertsCount: Number(facts.mediumAlertsCount ?? 0),
    };
  } catch (error) {
    console.error(
      'Error fetching Dependabot facts for entity:',
      stringifyEntityRef(entity),
      error,
    );
    return {
        criticalAlertsCount: 0,
        highAlertsCount: 0,
        mediumAlertsCount: 0,   
    };
  }
};

/**
 * Runs checks on Dependabot facts for a given entity using the Tech Insights API.
 * Returns the results from the checks.
 *
 * @param api - The TechInsightsApi instance used to fetch facts.
 * @param entity - The entity reference for which to fetch Dependabot facts.
 */
export const getDependabotChecks = async (
  api: TechInsightsApi,
  entity: CompoundEntityRef,
): Promise<{
  successRateCheck: boolean;
}> => {
  try {
    console.log(
      'Running checks on Dependabot facts for entity:',
      stringifyEntityRef(entity),
    );

    const checkResults = await api.runChecks(entity);

    const successRateCheck = checkResults.find(
      r => r.check.id === 'dependabot-success-rate',
    );

    console.log(
      'Result from Dependabot success rate check:',
      stringifyEntityRef(entity),
      successRateCheck?.result,
    );

    if (checkResults.length === 0) {
      console.error(
        'No check results found for entity:',
        stringifyEntityRef(entity),
      );
      return { successRateCheck: false };
    }

    return {
      successRateCheck: successRateCheck?.result === true,
    };
  } catch (error) {
    console.error(
      'Error running Dependabot checks for entity:',
      stringifyEntityRef(entity),
      error,
    );
    return { successRateCheck: false };
  }
};
