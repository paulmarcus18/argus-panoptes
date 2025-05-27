/**
 * This file reads a GitHub token from config, fetches GitHub Actions workflow data for repositories
 * Returns pipeline statuses for reporting workflows in a structured way that Tech Insights can consume
 */
import { FactRetriever, TechInsightFact } from '@backstage-community/plugin-tech-insights-node';
import { CatalogClient } from '@backstage/catalog-client';
import { JsonObject } from '@backstage/types';

// Configuration for which workflows to include for reporting
type ReportingWorkflowConfig = {
  include: string[]; 
};

type WorkflowRun = {
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;  
  head_branch: string; 
  workflow_id: number; 
};

// Added type for workflow definition from the GitHub API
type WorkflowDefinition = {
  id: number;
  name: string;
  path: string;
};

// Individual workflow success metrics
interface WorkflowSuccessMetrics extends JsonObject {
  workflowName: string;
  totalRuns: number;
  successfulRuns: number;
  successRate: number;
}

// Storing the facts as a JSON object for reporting pipelines
interface ReportingPipelineStatusSummary extends JsonObject {
  workflowMetrics: WorkflowSuccessMetrics[];
  totalIncludedWorkflows: number;
  overallSuccessRate: number;
}

/**
 * This FactRetriever queries GitHub Actions workflow data for specified repositories
 * and returns success metrics for reporting workflows only
 */
export const reportingPipelineStatusFactRetriever: FactRetriever = {
  id: 'reportingPipelineStatusFactRetriever',
  version: '0.1.0',
  entityFilter: [{ kind: 'component' }],
  schema: {
    workflowMetrics: {
      type: 'object',
      description: 'Success metrics for each reporting workflow as JSON object',
    },
    totalIncludedWorkflows: {
      type: 'integer',
      description: 'Total number of workflows included in reporting',
    },
    overallSuccessRate: {
      type: 'float',
      description: 'Overall success rate across all included workflows',
    }
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

    logger.info(`Processing ${githubEntities.length} GitHub entities for reporting pipelines`);

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

        // Extract reporting workflow configuration from entity annotations
        const reportingWorkflowConfig: ReportingWorkflowConfig = {
          include: [],
        };
        
        // Check for reporting/workflows annotation
        const reportingWorkflowsAnnotation = entity.metadata.annotations?.['reporting/workflows'];
        if (reportingWorkflowsAnnotation) {
          try {
            const parsedWorkflows = JSON.parse(reportingWorkflowsAnnotation);
            if (Array.isArray(parsedWorkflows)) {
              reportingWorkflowConfig.include = parsedWorkflows as string[];
            }
          } catch (error) {
            logger.warn(`Failed to parse reporting/workflows annotation for ${entity.metadata.name}: ${error}`);
          }
        }

        // First, fetch workflow definitions to get workflow IDs and names
        const workflowsApiUrl = `https://api.github.com/repos/${owner}/${repoName}/actions/workflows`;
        
        const headers: Record<string, string> = {
          'Accept': 'application/vnd.github.v3+json',
        };
        
        if (token) {
          headers['Authorization'] = `token ${token}`;
        }
        
        let workflowDefinitions: WorkflowDefinition[] = [];
        
        try {
          const workflowsResponse = await fetch(workflowsApiUrl, { headers });
          
          if (workflowsResponse.ok) {
            const workflowsData = await workflowsResponse.json();
            workflowDefinitions = workflowsData.workflows || [];
          } else {
            logger.error(`Failed to fetch workflow definitions for ${repoName}: ${workflowsResponse.statusText}`);
          }
        } catch (error: any) {
          logger.error(`Error fetching workflow definitions for ${repoName}: ${error.message}`);
        }

        // Fetch workflow runs with pagination
        const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/actions/runs?branch=main&per_page=100`;
        
        try {
          let page = 1;
          let hasMorePages = true;
          let allRuns: WorkflowRun[] = [];
          const maxPages = 30;
          
          while (hasMorePages && page <= maxPages) {
            const pageUrl = `${apiUrl}&page=${page}`;
            
            const response = await fetch(pageUrl, {
              method: 'GET',
              headers,
            });

            if (!response.ok) {
              logger.error(`Failed to fetch data for ${repoName}: ${response.statusText}`);
              break;
            }

            const data = await response.json();
            const pageRuns = data.workflow_runs as WorkflowRun[];
            
            allRuns = [...allRuns, ...pageRuns];
            
            if (pageRuns.length < 100) {
              hasMorePages = false;
            } else {
              const linkHeader = response.headers.get('Link');
              hasMorePages = linkHeader ? linkHeader.includes('rel="next"') : false;
            }
            
            page++;
          }
          
          // Filter to main branch runs
          const mainBranchRuns = allRuns.filter(run => run.head_branch === 'main');
          
          // Determine which workflows to include
          let includedWorkflowIds: number[] = [];
          let useAllWorkflows = false;
          
          if (reportingWorkflowConfig.include.length > 0) {
            // Map workflow names to IDs for included workflows
            const workflowNameToIdMap = new Map<string, number>();
            workflowDefinitions.forEach(workflow => {
              workflowNameToIdMap.set(workflow.name, workflow.id);
            });
            
            reportingWorkflowConfig.include.forEach(workflowName => {
              const workflowId = workflowNameToIdMap.get(workflowName);
              if (workflowId) {
                includedWorkflowIds.push(workflowId);
              }
            });
            
            // If no workflows found to include, use all workflows
            if (includedWorkflowIds.length === 0) {
              useAllWorkflows = true;
            }
          } else {
            // No specific workflows configured, use all workflows
            useAllWorkflows = true;
          }
          
          if (useAllWorkflows) {
            includedWorkflowIds = workflowDefinitions.map(w => w.id);
          }
          
          // Filter runs to only included workflows
          const includedRuns = mainBranchRuns.filter(run => 
            includedWorkflowIds.includes(run.workflow_id)
          );
          
          // Calculate success metrics for each workflow
          const workflowMetrics: WorkflowSuccessMetrics[] = [];
          
          // Group runs by workflow
          const runsByWorkflowId = new Map<number, WorkflowRun[]>();
          includedRuns.forEach(run => {
            if (!runsByWorkflowId.has(run.workflow_id)) {
              runsByWorkflowId.set(run.workflow_id, []);
            }
            runsByWorkflowId.get(run.workflow_id)!.push(run);
          });
          
          // Calculate metrics for each workflow
          runsByWorkflowId.forEach((runs, workflowId) => {
            const workflowName = workflowDefinitions.find(w => w.id === workflowId)?.name || `Workflow ID ${workflowId}`;
            const totalRuns = runs.length;
            const successfulRuns = runs.filter(
              run => run.status === 'completed' && run.conclusion === 'success'
            ).length;
            const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;
            
            workflowMetrics.push({
              workflowName,
              totalRuns,
              successfulRuns,
              successRate: Math.round(successRate * 100) / 100 // Round to 2 decimal places
            });
          });
          
          // Calculate overall success rate
          const totalRuns = workflowMetrics.reduce((sum, metric) => sum + metric.totalRuns, 0);
          const totalSuccessfulRuns = workflowMetrics.reduce((sum, metric) => sum + metric.successfulRuns, 0);
          const overallSuccessRate = totalRuns > 0 ? Math.round((totalSuccessfulRuns / totalRuns) * 10000) / 100 : 0;
          
          // Create summary object
          const reportingSummary: ReportingPipelineStatusSummary = {
            workflowMetrics,
            totalIncludedWorkflows: workflowMetrics.length,
            overallSuccessRate,
          };

          // Console log reporting pipelines summary only
          console.log(`📊 Reporting Pipelines Summary for ${repoName}:`);
          workflowMetrics.forEach(metric => {
            console.log(`- ${metric.workflowName}: ${metric.successfulRuns}/${metric.totalRuns} (${metric.successRate}% success rate)`);
          });
          console.log(`- Overall Success Rate: ${overallSuccessRate}%`);
          
          // Return the fact result object for this repository
          return {
            entity: {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            },
            facts: reportingSummary,
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