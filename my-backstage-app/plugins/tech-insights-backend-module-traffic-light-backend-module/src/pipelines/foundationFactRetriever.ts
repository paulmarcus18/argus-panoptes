import {
  FactRetriever,
  TechInsightFact,
} from '@backstage-community/plugin-tech-insights-node';
import { CatalogClient } from '@backstage/catalog-client';
import { JsonObject } from '@backstage/types';

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

// Metrics for each each workflow
type WorkflowMetrics = {
  name: string;
  totalRuns: number;
  successRuns: number;
  failureRuns: number;
  successRate: number;
};

// Defines an interface for foundation pipeline status metrics
interface PipelineStatusSummary extends JsonObject {
  totalWorkflowRunsCount: number;
  uniqueWorkflowsCount: number;
  successWorkflowRunsCount: number;
  failureWorkflowRunsCount: number;
  successRate: number;
  workflowMetrics: Record<string, WorkflowMetrics>; 
}

/**
 * Helper function to fetch all workflow definitions for a repository.
 */
async function fetchWorkflowDefinitions(
  owner: string,
  repoName: string,
  headers: Record<string, string>,
): Promise<WorkflowDefinition[]> {
  // API calls to get the workflow definitions first
  const workflowsApiUrl = `https://api.github.com/repos/${owner}/${repoName}/actions/workflows`;
  try {
    const workflowsResponse = await fetch(workflowsApiUrl, { headers });
    if (workflowsResponse.ok) {
      const workflowsData = await workflowsResponse.json();
      return workflowsData.workflows || [];
    }
  } catch (error) {
    // Fails silently and returns an empty array, as the main process can continue.
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
    const pageRuns = (data.workflow_runs || []) as WorkflowRun[];
    allRuns.push(...pageRuns);

    const linkHeader = response.headers.get('Link');

    // To check if we need to fetch more pages
    // ANd check for Link header with 'next' relation to confirm more pages
    if (pageRuns.length < 100 || !linkHeader?.includes('rel="next"')) {
      break;
    }
    page++;
  }

  // Filter for only main branch runs
  return allRuns.filter(run => run.head_branch === 'main');
}

/**
 * Helper function to calculate all metrics from the fetched workflow data.
 */
function calculateWorkflowMetrics(
  allRuns: WorkflowRun[],
  // Workflow definition to get accurate unique workflow counts
  workflowDefinitions: WorkflowDefinition[],
): PipelineStatusSummary {
  // Count all workflow runs on main branch
  const totalWorkflowRunsCount = allRuns.length;

  // Unique workflows
  const uniqueWorkflowsCount =
    workflowDefinitions.length > 0
      ? workflowDefinitions.length
      : new Set(allRuns.map(run => run.workflow_id)).size;

  // Count successful and failed runs
  const successWorkflowRunsCount = allRuns.filter(
    run => run.status === 'completed' && run.conclusion === 'success',
  ).length;

  const failureWorkflowRunsCount = allRuns.filter(
    run => run.status === 'completed' && run.conclusion === 'failure',
  ).length;

  // Calculate success rate
  const completedRuns = successWorkflowRunsCount + failureWorkflowRunsCount;
  const successRate =
    completedRuns > 0
      ? Math.round((successWorkflowRunsCount / completedRuns) * 100)
      : 0;

  // Detailed metrics for each individual workflow (stored in a dictionary)
  const workflowMetrics: Record<string, WorkflowMetrics> = {};

  // Map workflow IDs to workflow names using the workflow definitions
  const workflowIdToName = new Map<number, string>();
  workflowDefinitions.forEach(workflow => {
    workflowIdToName.set(workflow.id, workflow.name);
  });

  // Group runs by workflow ID
  const runsByWorkflowId = new Map<number, WorkflowRun[]>();
  allRuns.forEach(run => {
    const workflowRuns = runsByWorkflowId.get(run.workflow_id) || [];
    workflowRuns.push(run);
    runsByWorkflowId.set(run.workflow_id, workflowRuns);
  });
  
  // Calculate metrics for each workflow
  runsByWorkflowId.forEach((runs, workflowId) => {
    const workflowName =
      workflowIdToName.get(workflowId) ||
      runs[0]?.name ||
      `workflow-${workflowId}`;

    const totalRuns = runs.length;
    const successRuns = runs.filter(
      run => run.status === 'completed' && run.conclusion === 'success',
    ).length;
    const failureRuns = runs.filter(
      run => run.status === 'completed' && run.conclusion === 'failure',
    ).length;

    const workflowCompletedRuns = successRuns + failureRuns;
    const workflowSuccessRate =
      workflowCompletedRuns > 0
        ? Math.round((successRuns / workflowCompletedRuns) * 100)
        : 0;

    // Create safe key for the metrics object from workflow name
    const safeKey = workflowName.replace(/[^a-zA-Z0-9]/g, '_');
    workflowMetrics[safeKey] = {
      name: workflowName,
      totalRuns,
      successRuns,
      failureRuns,
      successRate: workflowSuccessRate,
    };
  });

  return {
    totalWorkflowRunsCount,
    uniqueWorkflowsCount,
    successWorkflowRunsCount,
    failureWorkflowRunsCount,
    successRate,
    workflowMetrics,
  };
}

/**
 * Creates a fact retriever for Foundation pipeline metrics from Github Actions. 
 * 
 * This retriever queries GitHub Actions workflow data for specified entity of type 'component'.
 * 
 * @returns A FactRetriever that collects pipeline status metrics
 */
export const foundationPipelineStatusFactRetriever: FactRetriever = {
  id: 'foundationPipelineStatusFactRetriever',
  version: '0.1.0',
  entityFilter: [{ kind: 'component' }],
  schema: {
    totalWorkflowRunsCount: {
      type: 'integer',
      description: 'Total number of workflow runs on main branch',
    },
    uniqueWorkflowsCount: {
      type: 'integer',
      description:
        'Number of unique workflows that have runs (matching GitHub UI)',
    },
    successWorkflowRunsCount: {
      type: 'integer',
      description: 'Number of successful workflow runs',
    },
    failureWorkflowRunsCount: {
      type: 'integer',
      description: 'Number of failed workflow runs',
    },
    successRate: {
      type: 'float',
      description: 'Success rate percentage of workflows (0-100)',
    },
    workflowMetrics: {
      type: 'object',
      description: 'Detailed metrics for each individual workflow',
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
          const projectSlug = entity.metadata.annotations?.['github.com/project-slug'] || '';
          const [owner, repoName] = projectSlug.split('/');

          if (!owner || !repoName) {
            return null;
          }

          const headers: Record<string, string> = {
            Accept: 'application/vnd.github.v3+json',
          };
          if (token) {
            headers.Authorization = `token ${token}`;
          }

          const [workflowDefinitions, allRuns] = await Promise.all([
            fetchWorkflowDefinitions(owner, repoName, headers),
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
                workflowMetrics: {},
              },
            };
          }

          // Construct pipelines status summary object
          const pipelineSummary = calculateWorkflowMetrics(
            allRuns,
            workflowDefinitions,
          );

          // Return the fact result object for this repo
          return {
            entity: {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
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
