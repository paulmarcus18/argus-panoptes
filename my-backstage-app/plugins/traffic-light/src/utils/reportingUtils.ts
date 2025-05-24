import {
  CompoundEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';

/**
 * Fetches Reporting pipeline facts for a given entity using the Tech Insights API.
 * Returns metrics like total workflow runs, unique workflows, success count, failure count, and success rate.
 *
 * @param api - The TechInsightsApi instance used to fetch facts.
 * @param entity - The entity reference for which to fetch Reporting pipeline facts.
 */
export const getReportingPipelineFacts = async (
  api: TechInsightsApi,
  entity: CompoundEntityRef,
): Promise<{
  workflowMetrics: object;
  totalIncludedWorkflows: number;
  overallSuccessRate: number;
}> => {
  try {
    console.log(
      'Fetching Reporting pipeline facts for entity:',
      stringifyEntityRef(entity),
    );

    const response = await api.getFacts(entity, [
      'reportingPipelineStatusFactRetriever',
    ]);

    console.log(
      'Raw Tech Insights API response:',
      JSON.stringify(response, null, 2),
    );

    const facts = response?.['reportingPipelineStatusFactRetriever']?.facts;

    if (!facts) {
      console.error('No facts found for entity:', stringifyEntityRef(entity));
      return {
        workflowMetrics: {},
        totalIncludedWorkflows: 0,
        overallSuccessRate: 0,
      };
    }

    console.log(
      'Parsed Reporting pipeline facts:',
      facts.workflowMetrics,
      facts.totalIncludedWorkflows,
      facts.overallSuccessRate,
    );

    return {
      workflowMetrics: Object(facts.workflowMetrics ?? {}),
      totalIncludedWorkflows: Number(facts.totalIncludedWorkflows ?? 0),
      overallSuccessRate: Number(facts.overallSuccessRate ?? 0),
    };
  } catch (error) {
    console.error(
      'Error fetching Reporting pipeline facts for entity:',
      stringifyEntityRef(entity),
      error,
    );
    return {
      workflowMetrics: {},
      totalIncludedWorkflows: 0,
      overallSuccessRate: 0,
    };
  }
};

/**
 * Runs checks on Reporting pipeline facts for a given entity using the Tech Insights API.
 * Returns the results from the checks.
 *
 * @param api - The TechInsightsApi instance used to fetch facts.
 * @param entity - The entity reference for which to fetch Reporting pipeline facts.
 */
export const getReportingPipelineChecks = async (
  api: TechInsightsApi,
  entity: CompoundEntityRef,
): Promise<{
  successRateCheck: boolean;
}> => {
  try {
    console.log(
      'Running checks on Reporting pipeline facts for entity:',
      stringifyEntityRef(entity),
    );

    const checkResults = await api.runChecks(entity);

    const successRateCheck = checkResults.find(
      r => r.check.id === 'reporting-success-rate',
    );

    console.log(
      'Result from Reporting success rate check:',
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
      'Error running Reporting pipeline checks for entity:',
      stringifyEntityRef(entity),
      error,
    );
    return { successRateCheck: false };
  }
};