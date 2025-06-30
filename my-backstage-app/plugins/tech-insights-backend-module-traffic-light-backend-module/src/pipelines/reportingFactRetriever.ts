import {
  FactRetriever,
  TechInsightFact,
} from '@backstage-community/plugin-tech-insights-node';
import { CatalogClient } from '@backstage/catalog-client';
import { JsonObject } from '@backstage/types';
import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import { LoggerService } from '@backstage/backend-plugin-api';

// To include the workflows defined in the catalog entity annotations
type ReportingWorkflowConfig = {
  include: string[];
};

// Represents a single workflow run from Github Actions API
type WorkflowRun = {
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  head_branch: string;
  workflow_id: number;
};

// Represents a workflow definition from GitHub API
type WorkflowDefinition = {
  id: number;
  name: string;
  path: string;
};

// Metrics for the last run of each workflow
interface WorkflowLastRunMetrics extends JsonObject {
  workflowName: string;
  lastRunStatus: 'success' | 'failure' | 'unknown';
  lastRunDate: string;
}

// Defines an interface for reporting pipeline status metrics based on last runs
interface ReportingPipelineStatusSummary extends JsonObject {
  workflowMetrics: WorkflowLastRunMetrics[];
  totalIncludedWorkflows: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
}

/**
 * Helper to parse and validate the reporting workflow config from annotations.
 */
function parseReportingConfig(
  entity: Entity,
  logger: LoggerService,
): ReportingWorkflowConfig | null {
  // Check annotations for reporting workflows
  const annotation = entity.metadata.annotations?.['reporting/workflows'];
  if (!annotation) {
    return null;
  }
  try {
    const include = JSON.parse(annotation);
    if (Array.isArray(include) && include.length > 0) {
      return { include };
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.warn(
        `Malformed 'reporting/workflows' annotation for entity ${stringifyEntityRef(
          entity,
        )}: ${error.message}`,
      );
    } else {
      logger.warn(
        `Malformed 'reporting/workflows' annotation for entity ${stringifyEntityRef(
          entity,
        )} with an unknown error.`,
      );
    }
    return null; // Ignore malformed JSON
  }
  return null;
}

/**
 * Helper to fetch all workflow definitions for a repository.
 */
async function fetchWorkflowDefinitions(
  owner: string,
  repoName: string,
  headers: Record<string, string>,
): Promise<WorkflowDefinition[] | null> {
  // Workflow definition to get accurate unique workflow counts
  const url = `https://api.github.com/repos/${owner}/${repoName}/actions/workflows`;
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.workflows ?? [];
  } catch {
    return null;
  }
}

/**
 * Helper to fetch the last run for a given workflow.
 */
async function fetchLastRun(
  owner: string,
  repoName: string,
  workflowId: number,
  branch: string,
  headers: Record<string, string>,
): Promise<WorkflowRun | null> {
  // Fetch the most recent run for this specific workflow on main branch
  const url = `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/${workflowId}/runs?branch=${branch}&per_page=1`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  return data.workflow_runs?.[0] ?? null;
}

/**
 * Helper to calculate the final summary metrics.
 */
function calculateReportingMetrics(
  workflowMetrics: WorkflowLastRunMetrics[],
): ReportingPipelineStatusSummary {
  // Calculate success/failure counts and rate
  const successfulRuns = workflowMetrics.filter(
    m => m.lastRunStatus === 'success',
  ).length;
  const failedRuns = workflowMetrics.filter(
    m => m.lastRunStatus === 'failure',
  ).length;
  const totalWorkflows = workflowMetrics.length;
  const successRate =
    totalWorkflows > 0
      ? Math.round((successfulRuns / totalWorkflows) * 10000) / 100
      : 0;

  return {
    workflowMetrics,
    totalIncludedWorkflows: totalWorkflows,
    successfulRuns,
    failedRuns,
    successRate,
  };
}

/**
 * Creates a fact retriever for Reporting pipeline metrics from Github Actions.
 *
 * This retriever queries GitHub Actions workflow data for specified entity of type 'component',
 * focusing only on the last run of each workflow in the reporting/workflows annotation.
 *
 * @returns A FactRetriever that collects pipeline status metrics based on last runs
 */
export const reportingPipelineStatusFactRetriever: FactRetriever = {
  id: 'reportingPipelineStatusFactRetriever',
  version: '0.2.0',
  entityFilter: [{ kind: 'component' }],
  schema: {
    workflowMetrics: {
      type: 'object',
      description:
        'Last run metrics for each reporting workflow as JSON object',
    },
    totalIncludedWorkflows: {
      type: 'integer',
      description: 'Total number of workflows included in reporting',
    },
    successfulRuns: {
      type: 'integer',
      description: 'Number of workflows with successful last runs',
    },
    failedRuns: {
      type: 'integer',
      description: 'Number of workflows with failed last runs',
    },
    successRate: {
      type: 'float',
      description: 'Success rate based on last runs of included workflows',
    },
  },

  /**
   * Handler function that retrieves pipeline status metrics for relevant entities.
   *
   * @param ctx - Context object containing configuration, logger, and other services
   * @returns Array of entity facts with pipeline status metrics
   */
  async handler({
    config,
    entityFilter,
    auth,
    discovery,
    logger,
  }): Promise<TechInsightFact[]> {
    // Retrieve GitHub token from config
    let token: string | undefined;
    try {
      const githubConfigs = config.getOptionalConfigArray(
        'integrations.github',
      );
      const githubConfig = githubConfigs?.[0];
      token = githubConfig?.getOptionalString('token');
    } catch {
      return [];
    }

    // Get catalog access token for fetching entities
    const { token: catalogToken } = await auth.getPluginRequestToken({
      onBehalfOf: await auth.getOwnServiceCredentials(),
      targetPluginId: 'catalog',
    });

    const catalogClient = new CatalogClient({ discoveryApi: discovery });

    // Fetch entities matching the provided filter
    const { items: entities } = await catalogClient.getEntities(
      { filter: entityFilter },
      { token: catalogToken },
    );

    // Filter entities that have GitHub repositories
    const githubEntities = entities.filter(entity => {
      const slug = entity.metadata.annotations?.['github.com/project-slug'];
      return !!slug;
    });

    // Process each Github-enabled component
    const results = await Promise.all(
      githubEntities.map(async entity => {
        try {
          // Parse the github repo information from entity annotations
          const projectSlug =
            entity.metadata.annotations?.['github.com/project-slug'] ?? '';
          const [owner, repoName] = projectSlug.split('/');

          if (!owner || !repoName) {
            return null;
          }

          const reportingConfig = parseReportingConfig(entity, logger);
          if (!reportingConfig) {
            return null;
          }

          const headers: Record<string, string> = {
            Accept: 'application/vnd.github.v3+json',
          };

          if (token) {
            headers.Authorization = `token ${token}`;
          }

          const workflowDefinitions = await fetchWorkflowDefinitions(
            owner,
            repoName,
            headers,
          );
          if (!workflowDefinitions) {
            return null;
          }

          // Map workflow names to workflow IDs using the workflow definitions
          const workflowNameToIdMap = new Map<string, number>();
          workflowDefinitions.forEach(workflow => {
            workflowNameToIdMap.set(workflow.name, workflow.id);
          });

          // Get workflow IDs for the specified workflows
          const includedWorkflowIds = reportingConfig.include
            .map(name => workflowNameToIdMap.get(name))
            .filter((id): id is number => id !== undefined);

          if (includedWorkflowIds.length === 0) {
            return null;
          }

          // Fetch the target branch from the entity annotations file
          const targetBranch =
            entity.metadata.annotations?.['reporting/target-branch'] ?? 'main';

          const workflowMetricsPromises = includedWorkflowIds.map(
            async workflowId => {
              const lastRun = await fetchLastRun(
                owner,
                repoName,
                workflowId,
                targetBranch,
                headers,
              );
              if (!lastRun) return null;

              const workflowName =
                workflowDefinitions.find(w => w.id === workflowId)?.name ??
                `Workflow ID ${workflowId}`;
              let lastRunStatus: 'success' | 'failure' | 'unknown' = 'unknown';
              if (lastRun.status === 'completed') {
                lastRunStatus =
                  lastRun.conclusion === 'success' ? 'success' : 'failure';
              }

              return {
                workflowName,
                lastRunStatus,
                lastRunDate: lastRun.created_at,
              };
            },
          );

          const workflowMetrics = (
            await Promise.all(workflowMetricsPromises)
          ).filter((m): m is WorkflowLastRunMetrics => m !== null);

          const reportingSummary = calculateReportingMetrics(workflowMetrics);

          return {
            entity: {
              kind: entity.kind,
              namespace: entity.metadata.namespace ?? 'default',
              name: entity.metadata.name,
            },
            facts: reportingSummary,
          } as TechInsightFact;
        } catch {
          return null;
        }
      }),
    );

    // Filter null results and ensure they match TechInsightFact type
    const validResults = results.filter(
      (r): r is TechInsightFact => r !== null,
    );
    return validResults;
  },
};
