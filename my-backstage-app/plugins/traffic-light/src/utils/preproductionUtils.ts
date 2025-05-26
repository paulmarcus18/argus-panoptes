import {
  CompoundEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';

/**
 * Fetches Pre-production pipeline facts for a given entity using the Tech Insights API.
 * Returns the following metrics: total workflow runs count, unique workflows, success count, failure count, and success metrics.
 *
 * @param api - The TechInsightsApi instance used to fetch facts.
 * @param entity - The entity reference for which to fetch Preproduction pipeline facts.
 * @returns An object containing Preproduction pipeline metrics for the entity.
 */
export const getPreproductionPipelineFacts = async (
  api: TechInsightsApi,
  entity: CompoundEntityRef,
): Promise<{
  totalWorkflowRunsCount: number;
  uniqueWorkflowsCount: number;
  successWorkflowRunsCount: number;
  failureWorkflowRunsCount: number;	
  successRate: number;
}> => {
  try {
    
    console.log('Fetching Preproduction pipeline facts for entity:', stringifyEntityRef(entity));

    // Fetch facts from the Tech Insights API for the given entity and retriever
    const response = await api.getFacts(entity, ['githubPipelineStatusFactRetriever']);

    // Log the raw response from the API for debugging
    console.log(
      'Raw Tech Insights API response:',
      JSON.stringify(response, null, 2),
    );

    // Extract the facts object from the response
    const facts = response?.['githubPipelineStatusFactRetriever']?.facts;

    // If no facts are found, log an error and return default values
    if (!facts) {
      console.error(
        'No facts found for entity:',
        stringifyEntityRef(entity),
      );
      return { totalWorkflowRunsCount: 0, uniqueWorkflowsCount: 0, successWorkflowRunsCount: 0, failureWorkflowRunsCount: 0, successRate: 0 };
    }

    // Log the parsed facts for debugging
    console.log(
      'Parsed Preproduction pipeline facts:', facts.totalWorkflowRunsCount, facts.uniqueWorkflowsCount, facts.successWorkflowRunsCount, facts.failureWorkflowRunsCount, facts.successRate
    );

    // Return the parsed facts, converting to appropriate types and providing defaults
    return {
      totalWorkflowRunsCount: Number(facts.totalWorkflowRunsCount ?? 0),
      uniqueWorkflowsCount: Number(facts.uniqueWorkflowsCount ?? 0),
      successWorkflowRunsCount: Number(facts.successWorkflowRunsCount ?? 0),
      failureWorkflowRunsCount: Number(facts.failureWorkflowRunsCount ?? 0),
      successRate: Number(facts.successRate ?? 0),
    };
  } catch (error) {
    // Log any errors encountered during the fetch process
    console.error(
      'Error fetching Preproduction pipeline facts for entity:',
      stringifyEntityRef(entity),
      error,
    );
    // Return default values if an error occurs
    return { totalWorkflowRunsCount: 0, uniqueWorkflowsCount: 0, successWorkflowRunsCount: 0, failureWorkflowRunsCount: 0, successRate: 0 };
  }
};

/**
 * Runs checks on Preproduction pipeline facts for a given entity using the Tech Insights API.
 * Returns the results from the checks.
 *
 * @param api - The TechInsightsApi instance used to fetch facts.
 * @param entity - The entity reference for which to fetch Preproduction pipeline facts.
 * @returns An object containing Preproduction pipeline metrics for the entity.
 */
export const getPreproductionPipelineChecks = async (
  api: TechInsightsApi,
  entity: CompoundEntityRef,
): Promise<{
    successRateCheck: boolean;
}> => {
  try {
    // Log which entity is being queried
    console.log('Running checks on SonarCloud facts for entity:', stringifyEntityRef(entity));

    // Facts checks
    const checkResults = await api.runChecks(entity);

    // Extract the results of each checks
    const successRateCheck = checkResults.find(r => r.check.id === 'preproduction-success-rate');
    
    // Log the results of the checks for debugging
    console.log("Result from Success rate checks for entity:", stringifyEntityRef(entity), successRateCheck?.result);

    // If no check results are found, log an error and return default values
    if (checkResults.length === 0) {
      console.error(
        'No facts found for entity:',
        stringifyEntityRef(entity),
      );
      return { successRateCheck:false,};
    }

    // Return the parsed facts, converting to appropriate types and providing defaults
    return {
        successRateCheck: successRateCheck?.result === true,
    };
  } catch (error) {
    // Log any errors encountered during the fetch process
    console.error(
      'Error fetching SonarCloud facts for entity:',
      stringifyEntityRef(entity),
      error,
    );
    // Return default values if an error occurs
    return { successRateCheck:false, };
}
};