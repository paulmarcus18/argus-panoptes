import {
  CompoundEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';

/**
 * Shape of the metrics object returned by the GitHub‑pipeline Tech Insights retriever.
 */
export interface PreproductionPipelineMetrics {
  totalWorkflowRunsCount: number;
  uniqueWorkflowsCount: number;
  successWorkflowRunsCount: number;
  failureWorkflowRunsCount: number;
  successRate: number;
}

/**
 * Shape of the boolean check results we care about.
 */
export interface PreproductionPipelineChecks {
  successRateCheck: boolean;
}

// ---------------------------------------------------------------------------
// internal helpers
// ---------------------------------------------------------------------------

const DEFAULT_METRICS: PreproductionPipelineMetrics = {
  totalWorkflowRunsCount: 0,
  uniqueWorkflowsCount: 0,
  successWorkflowRunsCount: 0,
  failureWorkflowRunsCount: 0,
  successRate: 0,
};

const DEFAULT_CHECKS: PreproductionPipelineChecks = {
  successRateCheck: false,
};

/**
 * **PreproductionPipelineInsightsService**
 *
 * A tiny wrapper around {@link TechInsightsApi} that gives you a strongly‑typed
 * way to fetch & evaluate pre‑production workflow data collected by the
 * `githubPipelineStatusFactRetriever` retriever.
 */
export class PreproductionUtils {
  constructor() {}

  /**
   * Fetches Pre-production pipeline facts for a given entity using the Tech Insights API.
   * Returns the following metrics: total workflow runs count, unique workflows, success count, failure count, and success metrics.
   *
   * @param api - The TechInsightsApi instance used to fetch facts.
   * @param entity - The entity reference for which to fetch Preproduction pipeline facts.
   * @returns An object containing Preproduction pipeline metrics for the entity.
   */
  async getPreproductionPipelineFacts(api: TechInsightsApi, entity: CompoundEntityRef): Promise<PreproductionPipelineMetrics> {
    try {
      // Log which entity is being queried
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
        return { ...DEFAULT_METRICS };
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
      return { ...DEFAULT_METRICS };
    }
  }

  /**
   * Runs checks on Preproduction pipeline facts for a given entity using the Tech Insights API.
   * Returns the results from the checks.
   *
   * @param api - The TechInsightsApi instance used to fetch facts.
   * @param entity - The entity reference for which to fetch Preproduction pipeline facts.
   * @returns An object containing Preproduction pipeline metrics for the entity.
   */
  async getPreproductionPipelineChecks(api: TechInsightsApi, entity: CompoundEntityRef): Promise<PreproductionPipelineChecks> {
    try {
      // Log which entity is being queried
      console.log('Running checks on Preproduction pipeline facts for entity:', stringifyEntityRef(entity));

      // Facts checks
      const checkResults = await api.runChecks(entity);

      // Extract the results of each checks
      const successRateCheck = checkResults.find(r => r.check.id === 'preproduction-success-rate');
      
      // Log the results of the checks for debugging
      console.log("Result from Success rate checks for entity:", stringifyEntityRef(entity), successRateCheck?.result);

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
          successRateCheck: successRateCheck?.result === true,
      };
    } catch (error) {
      // Log any errors encountered during the fetch process
      console.error(
        'Error fetching Preproduction pipeline checks for entity:',
        stringifyEntityRef(entity),
        error,
      );
      // Return default values if an error occurs
      return { ...DEFAULT_CHECKS };
    }
  }
}
