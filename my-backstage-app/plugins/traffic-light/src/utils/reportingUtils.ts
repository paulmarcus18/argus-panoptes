import {
  CompoundEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';

/**
 * Strongly‑typed shape of the metrics produced by the
 * `reportingFactRetriever` retriever.
 */
export interface ReportingPipelineMetrics {
  workflowMetrics: object;
  totalIncludedWorkflows: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
}

/**
 * Boolean check results we care about.
 */
export interface ReportingPipelineChecks {
  successRateCheck: boolean;
}

const DEFAULT_METRICS: ReportingPipelineMetrics = {
  workflowMetrics: {},
  totalIncludedWorkflows: 0,
  successfulRuns: 0,
  failedRuns: 0,
  successRate: 0,
};

const DEFAULT_CHECKS: ReportingPipelineChecks = {
  successRateCheck: false,
};

/**
 * A convenience wrapper around {@link TechInsightsApi} for reading and
 * evaluating Reporting‑pipeline data.
 */
export class ReportingUtils {
  constructor() {}

  /**
   * Fetches Reporting pipeline facts for a given entity using the Tech Insights API.
   * Returns metrics like total workflow runs, unique workflows, success count, failure count, and success rate.
   *
   * @param api - The TechInsightsApi instance used to fetch facts.
   * @param entity - The entity reference for which to fetch Reporting pipeline facts.
   * @returns An object containing Reporting pipeline metrics for the entity.
   */
  async getReportingPipelineFacts(api: TechInsightsApi, entity: CompoundEntityRef): Promise<ReportingPipelineMetrics> {
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
        return { ...DEFAULT_METRICS };
      }

      console.log(
        'Parsed Reporting pipeline facts:',
        facts.workflowMetrics,
        facts.totalIncludedWorkflows,
        facts.sucessfulRuns,
        facts.failedRuns,
        facts.successRate,
      );

      return {
        workflowMetrics: Object(facts.workflowMetrics ?? {}),
        totalIncludedWorkflows: Number(facts.totalIncludedWorkflows ?? 0),
        successfulRuns: Number(facts.sucessfulRuns ?? 0),
        failedRuns: Number(facts.failedRuns ?? 0),
        successRate: Number(facts.successRate ?? 0),
      };
    } catch (error) {
      console.error(
        'Error fetching Reporting pipeline facts for entity:',
        stringifyEntityRef(entity),
        error,
      );
      return { ...DEFAULT_METRICS };
    }
  }

  /**
   * Runs checks on Reporting pipeline facts for a given entity using the Tech Insights API.
   * Returns the results from the checks.
   *
   * @param api - The TechInsightsApi instance used to fetch facts.
   * @param entity - The entity reference for which to fetch Reporting pipeline facts.
   * @returns An object containing the results of the checks.
   */
  async getReportingPipelineChecks(api: TechInsightsApi, entity: CompoundEntityRef): Promise<ReportingPipelineChecks> {
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
        return { ...DEFAULT_CHECKS };
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
      return { ...DEFAULT_CHECKS };
    }
  }
}