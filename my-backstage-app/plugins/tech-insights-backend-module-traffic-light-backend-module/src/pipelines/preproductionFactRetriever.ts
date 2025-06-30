import {
  FactRetriever,
  TechInsightFact,
} from '@backstage-community/plugin-tech-insights-node';
import { CatalogClient } from '@backstage/catalog-client';
import { JsonObject } from '@backstage/types';
import { Entity } from '@backstage/catalog-model';
import { LoggerService } from '@backstage/backend-plugin-api';

// To exclude workflows using regex patterns defined in the catalog entity annotations
type WorkflowConfig = {
  excludePatterns: string[];
};

// Represents a single workflow run from GitHub Actions API
type WorkflowRun = {
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  head_branch: string;
  workflow_id: number;
};

// Represents a workflow definition from GitHub Actions API
type WorkflowDefinition = {
  id: number;
  name: string;
  path: string;
};

// Defines an interface for pre-production pipeline status metrics
interface PipelineStatusSummary extends JsonObject {
  totalWorkflowRunsCount: number;
  uniqueWorkflowsCount: number;
  successWorkflowRunsCount: number;
  failureWorkflowRunsCount: number;
  successRate: number;
}

/**
 * Helper function to check if a workflow name matches any of the exclude patterns
 * @param workflowName - The name of the workflow to check
 * @param excludePatterns - Array of regex patterns to match against
 * @returns true if the workflow should be excluded, false otherwise
 */
function shouldExcludeWorkflow(
  workflowName: string,
  excludePatterns: string[],
): boolean {
  return excludePatterns.some(pattern => {
    try {
      const regex = new RegExp(pattern, 'i'); // case-insensitive matching
      return regex.test(workflowName);
    } catch {
      return workflowName.toLowerCase().includes(pattern.toLowerCase());
    }
  });
}

/**
 * Helper function to parse workflow configuration from entity annotations.
 */
function parseWorkflowConfig(entity: Entity): WorkflowConfig {
  const workflowConfig: WorkflowConfig = { excludePatterns: [] };
  // Check annotations for workflow patterns to exclude
  const excludeAnnotation =
    entity.metadata.annotations?.['preproduction/exclude'];
  if (excludeAnnotation) {
    try {
      const excludeList = JSON.parse(excludeAnnotation);
      if (Array.isArray(excludeList)) {
        workflowConfig.excludePatterns = excludeList as string[];
      }
    } catch {
      // Malformed JSON is ignored, proceed with no exclusions.
    }
  }
  return workflowConfig;
}

/**
 * Helper function to fetch all workflow definitions for a repository.
 */
async function fetchWorkflowDefinitions(
  owner: string,
  repoName: string,
  headers: Record<string, string>,
  logger: LoggerService,
): Promise<WorkflowDefinition[]> {
  // Workflow definition to get accurate unique workflow counts
  const workflowsApiUrl = `https://api.github.com/repos/${owner}/${repoName}/actions/workflows`;
  try {
    const workflowsResponse = await fetch(workflowsApiUrl, { headers });
    if (workflowsResponse.ok) {
      const workflowsData = await workflowsResponse.json();
      return workflowsData.workflows ?? [];
    }
  } catch (error) {
    // If fetching workflow definitions fails, log the error
    if (error instanceof Error) {
      logger.warn(
        `Failed to fetch workflow definitions for ${owner}/${repoName}:`,
        error,
      );
    } else {
      logger.warn(
        `Failed to fetch workflow definitions for ${owner}/${repoName}: An unknown error occurred.`,
      );
    }
  }
  return [];
}

/**
 * Helper function to fetch all workflow runs using pagination.
 */
async function fetchAllWorkflowRuns(
  owner: string,
  repoName: string,
  headers: Record<string, string>,
): Promise<WorkflowRun[]> {
  const allRuns: WorkflowRun[] = [];
  // Fetch all workflow runs from the main branch using pagination
  const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/actions/runs?branch=main&per_page=100`;
  let page = 1;
  const maxPages = 30; // Limit to 30 pages to avoid excessive API calls

  // Paginate through all workflow runs
  while (page <= maxPages) {
    const pageUrl = `${apiUrl}&page=${page}`;
    const response = await fetch(pageUrl, { method: 'GET', headers });

    if (!response.ok) break;

    const data = await response.json();
    const pageRuns = (data.workflow_runs ?? []) as WorkflowRun[];
    allRuns.push(...pageRuns);

    const linkHeader = response.headers.get('Link');
    // To check if we need to fetch more pages
    // And check for Link header with 'next' relation to confirm more pages
    if (pageRuns.length < 100 || !linkHeader?.includes('rel="next"')) {
      break;
    }
    page++;
  }

  // Filter runs to only include those on the main branch
  return allRuns.filter(run => run.head_branch === 'main');
}

/**
 * Helper function to calculate all metrics from the fetched workflow data.
 */
function calculatePreproductionMetrics(
  allRuns: WorkflowRun[],
  workflowDefinitions: WorkflowDefinition[],
  workflowConfig: WorkflowConfig,
): PipelineStatusSummary {
  const excludedWorkflowIds = workflowDefinitions
    .filter(workflow =>
      shouldExcludeWorkflow(workflow.name, workflowConfig.excludePatterns),
    )
    .map(workflow => workflow.id);

  // Filter out excluded workflow runs for success/failure calculations
  const nonExcludedRuns = allRuns.filter(
    run => !excludedWorkflowIds.includes(run.workflow_id),
  );

  // Calculate success and failure runs from the non-excluded runs
  const successWorkflowRunsCount = nonExcludedRuns.filter(
    run => run.status === 'completed' && run.conclusion === 'success',
  ).length;

  const failureWorkflowRunsCount = nonExcludedRuns.filter(
    run => run.status === 'completed' && run.conclusion === 'failure',
  ).length;

  // Calculate success rate as percentage
  const totalCompletedRuns =
    successWorkflowRunsCount + failureWorkflowRunsCount;
  const successRate =
    totalCompletedRuns > 0
      ? parseFloat(
          ((successWorkflowRunsCount / totalCompletedRuns) * 100).toFixed(2),
        )
      : 0;

  return {
    totalWorkflowRunsCount: allRuns.length,
    uniqueWorkflowsCount:
      workflowDefinitions.length > 0
        ? workflowDefinitions.length
        : new Set(allRuns.map(run => run.workflow_id)).size,
    successWorkflowRunsCount,
    failureWorkflowRunsCount,
    successRate,
  };
}

/**
 * Creates a fact retriever for Pre-production pipeline metrics from GitHub Actions.
 *
 * This retriever queries GitHub Actions workflow data for specified entity of type 'component'.
 * Supports regex patterns for excluding workflows based on their names.
 *
 * @returns A FactRetriever that collects pipeline status metrics
 */
export const githubPipelineStatusFactRetriever: FactRetriever = {
  id: 'githubPipelineStatusFactRetriever',
  version: '0.2.0', // Bumped version to reflect regex support
  entityFilter: [{ kind: 'component' }],
  schema: {
    totalWorkflowRunsCount: {
      type: 'integer',
      description:
        'Total number of workflow runs on main branch (including excluded)',
    },
    uniqueWorkflowsCount: {
      type: 'integer',
      description:
        'Number of unique workflows that have runs (matching GitHub UI)',
    },
    successWorkflowRunsCount: {
      type: 'integer',
      description:
        'Number of successful workflow runs (excluding workflows matching exclude patterns)',
    },
    failureWorkflowRunsCount: {
      type: 'integer',
      description:
        'Number of failed workflow runs (excluding workflows matching exclude patterns)',
    },
    successRate: {
      type: 'float',
      description:
        'Success rate percentage (0-100) of workflow runs (excluding workflows matching exclude patterns)',
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
    } catch (e) {
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

          const workflowConfig: WorkflowConfig = parseWorkflowConfig(entity);
          const headers: Record<string, string> = {
            Accept: 'application/vnd.github.v3+json',
          };

          if (token) {
            headers.Authorization = `token ${token}`;
          }

          const [workflowDefinitions, allRuns] = await Promise.all([
            fetchWorkflowDefinitions(owner, repoName, headers, logger),
            fetchAllWorkflowRuns(owner, repoName, headers),
          ]);

          if (allRuns.length === 0) {
            return {
              entity,
              facts: {
                totalWorkflowRunsCount: 0,
                uniqueWorkflowsCount: workflowDefinitions.length,
                successWorkflowRunsCount: 0,
                failureWorkflowRunsCount: 0,
                successRate: 0,
              },
            };
          }

          const pipelineSummary = calculatePreproductionMetrics(
            allRuns,
            workflowDefinitions,
            workflowConfig,
          );

          // Return the fact result object for this repo
          return {
            entity: {
              kind: entity.kind,
              namespace: entity.metadata.namespace ?? 'default',
              name: entity.metadata.name,
            },
            facts: pipelineSummary,
          } as TechInsightFact;
        } catch (error: any) {
          return null;
        }
      }),
    );

    // Filter out null results and return valid pipeline metrics
    const validResults = results.filter(
      (r): r is TechInsightFact => r !== null,
    );
    return validResults;
  },
};
