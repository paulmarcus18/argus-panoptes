import {
  CompoundEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';

/**
 * Strongly‑typed shape of the metrics produced by the
 * `foundationFactRetriever` retriever.
 */
export interface FoundationPipelineMetrics {
  totalWorkflowRunsCount: number;
  uniqueWorkflowsCount: number;
  successWorkflowRunsCount: number;
  failureWorkflowRunsCount: number;
  successRate: number;
}

/**
 * Boolean check results we care about.
 */
export interface FoundationPipelineChecks {
  successRateCheck: boolean;
}

const DEFAULT_METRICS: FoundationPipelineMetrics = {
  totalWorkflowRunsCount: 0,
  uniqueWorkflowsCount: 0,
  successWorkflowRunsCount: 0,
  failureWorkflowRunsCount: 0,
  successRate: 0,
};

const DEFAULT_CHECKS: FoundationPipelineChecks = {
  successRateCheck: false,
};

/**
 * A convenience wrapper around {@link TechInsightsApi} for reading and
 * evaluating Foundation‑pipeline data.
 */
export class FoundationUtils {
  constructor(private readonly api: TechInsightsApi) {}

  /**
   * Fetches Foundation pipeline facts for a given entity using the Tech Insights API.
   * Returns metrics like total workflow runs, unique workflows, success count, failure count, and success rate.
   *
   * @param api - The TechInsightsApi instance used to fetch facts.
   * @param entity - The entity reference for which to fetch Foundation pipeline facts.
   * @returns An object containing Foundation pipeline metrics for the entity.
   */
  async getFoundationPipelineFacts(api: TechInsightsApi, entity: CompoundEntityRef): Promise<FoundationPipelineMetrics> {
    try {
      console.log(
        'Fetching Foundation pipeline facts for entity:',
        stringifyEntityRef(entity),
      );

      const response = await api.getFacts(entity, [
        'foundationPipelineStatusFactRetriever',
      ]);

      console.log(
        'Raw Tech Insights API response:',
        JSON.stringify(response, null, 2),
      );

      const facts = response?.['foundationPipelineStatusFactRetriever']?.facts;

      if (!facts) {
        console.error('No facts found for entity:', stringifyEntityRef(entity));
        return { ...DEFAULT_METRICS };
      }

      console.log(
        'Parsed Foundation pipeline facts:',
        facts.totalWorkflowRunsCount,
        facts.uniqueWorkflowsCount,
        facts.successWorkflowRunsCount,
        facts.failureWorkflowRunsCount,
        facts.successRate,
      );

      return {
        totalWorkflowRunsCount: Number(facts.totalWorkflowRunsCount ?? 0),
        uniqueWorkflowsCount: Number(facts.uniqueWorkflowsCount ?? 0),
        successWorkflowRunsCount: Number(facts.successWorkflowRunsCount ?? 0),
        failureWorkflowRunsCount: Number(facts.failureWorkflowRunsCount ?? 0),
        successRate: Number(facts.successRate ?? 0),
      };
    } catch (error) {
      console.error(
        'Error fetching Foundation pipeline facts for entity:',
        stringifyEntityRef(entity),
        error,
      );
      return { ...DEFAULT_METRICS }
    }
  }

  /**
   * Runs checks on Foundation pipeline facts for a given entity using the Tech Insights API.
   * Returns the results from the checks.
   *
   * @param api - The TechInsightsApi instance used to fetch facts.
   * @param entity - The entity reference for which to fetch Foundation pipeline facts.
   * @returns An object containing the results of the checks.
   */
  async getFoundationPipelineChecks(api: TechInsightsApi, entity: CompoundEntityRef): Promise<FoundationPipelineChecks> {
    try {
      console.log(
        'Running checks on Foundation pipeline facts for entity:',
        stringifyEntityRef(entity),
      );

      const checkResults = await api.runChecks(entity);

      const successRateCheck = checkResults.find(
        r => r.check.id === 'foundation-success-rate',
      );

      console.log(
        'Result from Foundation success rate check:',
        stringifyEntityRef(entity),
        successRateCheck?.result,
      );

      if (checkResults.length === 0) {
        console.error(
          'No check results found for entity:',
          stringifyEntityRef(entity),
        );
        return { ...DEFAULT_CHECKS };
      }

      return {
        successRateCheck: successRateCheck?.result === true,
      };
    } catch (error) {
      console.error(
        'Error running Foundation pipeline checks for entity:',
        stringifyEntityRef(entity),
        error,
      );
      return { ...DEFAULT_CHECKS };
    }
  }
}