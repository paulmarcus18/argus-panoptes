/**
 * This file reads a GitHub token from config, fetches GitHub Actions workflow data for repositories
 * Returns pipeline statuses in a structured way that Tech Insights can consume
 * Modified to track latest run status for each workflow and workflow names
 */
import { FactRetriever, TechInsightFact } from '@backstage-community/plugin-tech-insights-node';
import { CatalogClient } from '@backstage/catalog-client';
import { JsonObject } from '@backstage/types';

type WorkflowRun = {
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  head_branch: string;
  workflow_id: number;
};

// Type representing the latest run status for each workflow
type WorkflowLatestStatus = {
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  success: boolean; // Simple success metric (true/false)
};

// The main result structure as a JsonObject compatible type
interface PipelineStatusSummary extends JsonObject {
  totalUniqueWorkflows: number;        // Number of unique workflows found
  workflowNames: string[];             // List of all workflow names
  workflowStatuses: {                 // Latest status for each workflow 
    name: string;
    success: boolean;                  // Success metric (true/false)
  }[];
  successfulWorkflows: number;         // Count of workflows with latest run successful
  failedWorkflows: number;             // Count of workflows with latest run failed
  inProgressWorkflows: number;         // Count of workflows with latest run in progress
  successRate: number;                 // Percentage of successful workflows (0-100)
}

/**
 * This FactRetriever queries GitHub Actions workflow data for specified repositories
 * and returns detailed pipeline status information based on latest runs
 */
export const githubPipelineStatusFactRetriever: FactRetriever = {
  // Identifier for this fact retriever
  id: 'githubPipelineStatusFactRetriever',
  // Versioning information for this retriever
  version: '0.3.0',
  // Entity filter to specify which entities this retriever applies to
  entityFilter: [{ kind: 'component' }],
  // Defines the structure of the facts returned
  schema: {
    totalUniqueWorkflows: {
      type: 'integer',
      description: 'Total number of unique workflows on main branch',
    },
    workflowNames: {
      type: 'set',
      description: 'List of all workflow names',
    },
    workflowStatuses: {
      type: 'set',
      description: 'Latest status (success/failure) for each workflow',
    },
    successfulWorkflows: {
      type: 'integer',
      description: 'Number of workflows with latest run successful',
    },
    failedWorkflows: {
      type: 'integer',
      description: 'Number of workflows with latest run failed',
    },
    inProgressWorkflows: {
      type: 'integer',
      description: 'Number of workflows with latest run in progress',
    },
    successRate: {
      type: 'float',
      description: 'Percentage of workflows with successful latest run (0-100)',
    },
  },

  // Main logic of the retriever
  async handler({ config, logger, entityFilter, auth, discovery }): Promise<TechInsightFact[]> {
    // Retrieve GitHub token from config
    let token: string | undefined;
    try {
      const githubConfigs = config.getOptionalConfigArray('integrations.github');
      const githubConfig = githubConfigs?.[0];
      token = githubConfig?.getOptionalString('token');
    } catch (e) {
      logger.error(`Could not retrieve GitHub token: ${e}`);
      return [];
    }

    // Get catalog access token for fetching entities
    const { token: catalogToken } = await auth.getPluginRequestToken({
      onBehalfOf: await auth.getOwnServiceCredentials(),
      targetPluginId: 'catalog',
    });

    // Instantiate the CatalogClient
    const catalogClient = new CatalogClient({ discoveryApi: discovery });

    // Fetch the list of entities matching the entityFilter
    const { items: entities } = await catalogClient.getEntities(
      { filter: entityFilter },
      { token: catalogToken },
    );

    // Filter entities that have GitHub repositories
    const githubEntities = entities.filter(entity => {
      const slug = entity.metadata.annotations?.['github.com/project-slug'];
      return !!slug;
    });

    // Process each entity with GitHub integration
    const results = await Promise.all(
      githubEntities.map(async entity => {
        // Extract owner and repo from the 'github.com/project-slug' annotation
        const projectSlug = entity.metadata.annotations?.['github.com/project-slug'] || '';
        const [owner, repoName] = projectSlug.split('/');

        if (!owner || !repoName) {
          logger.warn(`Invalid GitHub project slug for entity ${entity.metadata.name}: ${projectSlug}`);
          return null;
        }

        // Prepare HTTP headers
        const headers: Record<string, string> = {
          'Accept': 'application/vnd.github.v3+json',
        };
        
        if (token) {
          headers['Authorization'] = `token ${token}`;
        }
        
        // First, fetch all workflow definitions to get accurate total count and names
        const workflowsApiUrl = `https://api.github.com/repos/${owner}/${repoName}/actions/workflows`;
        let allWorkflows: { id: number; name: string; path: string; state: string }[] = [];
        
        try {
          const workflowsResponse = await fetch(workflowsApiUrl, { headers });
          
          if (workflowsResponse.ok) {
            const workflowsData = await workflowsResponse.json();
            allWorkflows = workflowsData.workflows || [];
            console.log(`\n🔍 [${repoName}] Found ${allWorkflows.length} total workflow definitions`);
            
            // Log all workflow names for verification
            console.log(`\n📋 [${repoName}] All workflow names:`);
            allWorkflows.forEach(workflow => {
              console.log(`- ${workflow.name} (ID: ${workflow.id})`);
            });
          } else {
            logger.error(`Failed to fetch workflow definitions for ${repoName}: ${workflowsResponse.statusText}`);
          }
        } catch (error: any) {
          logger.error(`Error fetching workflow definitions for ${repoName}: ${error.message}`);
        }

        // Get workflow runs to determine status for each workflow
        const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/actions/runs?branch=main&per_page=100`;
        
        try {
          // Fetch workflow run data from GitHub API with pagination
          let page = 1;
          let hasMorePages = true;
          let allRuns: WorkflowRun[] = [];
          const maxPages = 10; // Limit to 10 pages (1000 runs) for performance
          
          // Loop through paginated results
          while (hasMorePages && page <= maxPages) {
            const pageUrl = `${apiUrl}&page=${page}`;
            console.log(`[${repoName}] Fetching workflow runs page ${page}...`);
            
            const response = await fetch(pageUrl, {
              method: 'GET',
              headers,
            });

            if (!response.ok) {
              console.log(`[${repoName}] Failed to fetch data (page ${page}): ${response.status} ${response.statusText}`);
              logger.error(`Failed to fetch data for ${repoName}: ${response.statusText}`);
              break;
            }

            const data = await response.json();
            const pageRuns = data.workflow_runs as WorkflowRun[];
            
            // Add this page's runs to our collection
            allRuns = [...allRuns, ...pageRuns];
            
            // Check if we need to fetch more pages
            if (pageRuns.length < 100) {
              hasMorePages = false;
            } else {
              // Check for Link header with 'next' relation
              const linkHeader = response.headers.get('Link');
              hasMorePages = linkHeader ? linkHeader.includes('rel="next"') : false;
            }
            
            page++;
          }
          
          console.log(`[${repoName}] Fetched ${allRuns.length} total workflow runs`);
          
          // Filter runs to ensure they're on main branch
          const mainBranchRuns = allRuns.filter(run => run.head_branch === 'main');
          console.log(`[${repoName}] Filtered to ${mainBranchRuns.length} main branch runs`);
          
          // If no workflows found, return early with empty data
          if (allWorkflows.length === 0) {
            console.log(`[${repoName}] No workflow definitions found`);
            return {
              entity: {
                kind: entity.kind,
                namespace: entity.metadata.namespace || 'default',
                name: entity.metadata.name,
              },
              facts: {
                totalUniqueWorkflows: 0,
                workflowNames: [],
                workflowStatuses: [],
                successfulWorkflows: 0,
                failedWorkflows: 0,
                inProgressWorkflows: 0,
                successRate: 0,
              } as PipelineStatusSummary,
            } as TechInsightFact;
          }
          
          // Get latest run for each workflow ID (not name)
          const latestRunByWorkflowId = new Map<number, WorkflowRun>();
          
          // Group runs by workflow ID and find latest for each
          mainBranchRuns.forEach(run => {
            const existingRun = latestRunByWorkflowId.get(run.workflow_id);
            
            // If we don't have this workflow yet, or if this run is newer
            if (!existingRun || new Date(run.created_at) > new Date(existingRun.created_at)) {
              latestRunByWorkflowId.set(run.workflow_id, run);
            }
          });
          
          // Convert to array of latest statuses with success metric
          const latestWorkflowStatuses: WorkflowLatestStatus[] = Array.from(latestRunByWorkflowId.values()).map(run => ({
            name: run.name,
            status: run.status,
            conclusion: run.conclusion,
            created_at: run.created_at,
            success: run.status === 'completed' && run.conclusion === 'success'
          }));
          
          console.log(`[${repoName}] Found ${latestWorkflowStatuses.length} unique workflows with runs on main branch`);
          
          // Extract all workflow names from the definitions
          const workflowNames = allWorkflows.map(workflow => workflow.name);
          
          // Create simplified status records with just name and success
          const workflowStatuses = latestWorkflowStatuses.map(status => ({
            name: status.name,
            success: status.success
          }));
          
          // Calculate metrics
          const successfulWorkflows = latestWorkflowStatuses.filter(status => status.success).length;
          
          const failedWorkflows = latestWorkflowStatuses.filter(
            status => status.status === 'completed' && !status.success
          ).length;
          
          const inProgressWorkflows = latestWorkflowStatuses.filter(
            status => status.status !== 'completed'
          ).length;
          
          // Calculate success rate
          const totalComplete = successfulWorkflows + failedWorkflows;
          const successRate = totalComplete > 0 ? Math.round((successfulWorkflows / totalComplete) * 100) : 0;
          
          // Create summary object with total workflows from the workflow definitions endpoint
          const pipelineSummary: PipelineStatusSummary = {
            totalUniqueWorkflows: allWorkflows.length,  // Use the count from workflow definitions
            workflowNames,             // Add the workflow names
            workflowStatuses,          // Add workflow success metrics
            successfulWorkflows,
            failedWorkflows,
            inProgressWorkflows,
            successRate,
          };

          // Log detailed success metrics for each latest workflow run
          console.log(`\n📊 [${repoName}] PIPELINE SUMMARY:`);
          console.log(`- Total unique workflows: ${pipelineSummary.totalUniqueWorkflows}`);
          console.log(`- Workflows with runs on main: ${latestWorkflowStatuses.length}`);
          console.log(`- Successful workflows (latest run): ${pipelineSummary.successfulWorkflows}`);
          console.log(`- Failed workflows (latest run): ${pipelineSummary.failedWorkflows}`);
          console.log(`- In progress workflows (latest run): ${pipelineSummary.inProgressWorkflows}`);
          console.log(`- Overall workflow success rate: ${pipelineSummary.successRate}%`);
          
          // Detail about each workflow's latest status
          console.log(`\n[${repoName}] Latest status for each workflow with a run:`);
          latestWorkflowStatuses.forEach(status => {
            const statusSymbol = status.success ? '✅' : 
                               status.status !== 'completed' ? '⏳' : '❌';
            console.log(`${statusSymbol} ${status.name}: ${status.success ? 'SUCCESS' : 'FAILURE'} (${status.created_at})`);
          });

          // Return the fact result object for this repository
          return {
            entity: {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            },
            facts: pipelineSummary,
          } as TechInsightFact;
        } catch (error: any) {
          logger.error(`Error fetching pipeline data for ${owner}/${repoName}: ${error.message}`);
          return null;
        }
      }),
    );

    // Filter null results and ensure they match TechInsightFact type
    const validResults = results.filter((r): r is TechInsightFact => r !== null);
    return validResults;
  },
};