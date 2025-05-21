// /**
//  * This file reads a GitHub token from config, fetches GitHub Actions workflow data for repositories
//  * Returns pipeline statuses in a structured way that Tech Insights can consume
//  */
// import { FactRetriever, TechInsightFact } from '@backstage-community/plugin-tech-insights-node';
// import { CatalogClient } from '@backstage/catalog-client';
// import { JsonObject } from '@backstage/types';

// type WorkflowRun = {
//   name: string;
//   status: string;
//   conclusion: string | null;
//   created_at: string;  
//   head_branch: string; 
//   workflow_id: number; 
// };

// // Added type for workflow definition from the GitHub API
// type WorkflowDefinition = {
//   id: number;
//   name: string;
//   path: string;
// };

// // Storing the facts as a JSON object
// interface PipelineStatusSummary extends JsonObject {
//   totalWorkflowRunsCount: number;       
//   uniqueWorkflowsCount: number;         
//   successWorkflowRunsCount: number;     
//   failureWorkflowRunsCount: number;
//   successRate: number;                  // Added success rate metric
// }

// /**
//  * This FactRetriever queries GitHub Actions workflow data for specified repositories
//  * and returns detailed pipeline status information for all workflows
//  */
// export const foundationPipelineStatusFactRetriever: FactRetriever = {
//   id: 'oundationPipelineStatusFactRetriever',
//   version: '0.1.0',
//   entityFilter: [{ kind: 'component' }],
//   schema: {
//     totalWorkflowRunsCount: {
//       type: 'integer',
//       description: 'Total number of workflow runs on main branch',
//     },
//     uniqueWorkflowsCount: {
//       type: 'integer',
//       description: 'Number of unique workflows that have runs (matching GitHub UI)',
//     },
//     successWorkflowRunsCount: {
//       type: 'integer',
//       description: 'Number of successful workflow runs',
//     },
//     failureWorkflowRunsCount: {
//       type: 'integer',
//       description: 'Number of failed workflow runs',
//     },
//     successRate: {
//       type: 'float',
//       description: 'Success rate percentage of workflows (0-100)',
//     }
//   },

//   // Main logic of the retriever
//   async handler({ config, logger, entityFilter, auth, discovery }): Promise<TechInsightFact[]> {
//     // Retrieve GitHub token from config
//     let token: string | undefined;
//     try {
//       const githubConfigs = config.getOptionalConfigArray('integrations.github');
//       const githubConfig = githubConfigs?.[0];
//       token = githubConfig?.getOptionalString('token');
//     } catch (e) {
//       logger.error(`Could not retrieve GitHub token: ${e}`);
//       return [];
//     }

//     // Get catalog access token for fetching entities
//     const { token: catalogToken } = await auth.getPluginRequestToken({
//       onBehalfOf: await auth.getOwnServiceCredentials(),
//       targetPluginId: 'catalog',
//     });

//     // Instantiate the CatalogClient
//     const catalogClient = new CatalogClient({ discoveryApi: discovery });

//     // Fetch the list of entities matching the entityFilter
//     const { items: entities } = await catalogClient.getEntities(
//       { filter: entityFilter },
//       { token: catalogToken },
//     );

//     // Filter entities that have GitHub repositories
//     const githubEntities = entities.filter(entity => {
//       const slug = entity.metadata.annotations?.['github.com/project-slug'];
//       return !!slug;
//     });

//     logger.info(`Processing ${githubEntities.length} GitHub entities`);

//     // Process each entity with GitHub integration
//     const results = await Promise.all(
//       githubEntities.map(async entity => {
//         // Extract owner and repo from the 'github.com/project-slug' annotation
//         const projectSlug = entity.metadata.annotations?.['github.com/project-slug'] || '';
//         const [owner, repoName] = projectSlug.split('/');

//         if (!owner || !repoName) {
//           logger.warn(`Invalid GitHub project slug for entity ${entity.metadata.name}: ${projectSlug}`);
//           return null;
//         }

//         // First, fetch workflow definitions to get an accurate count of unique workflows
//         const workflowsApiUrl = `https://api.github.com/repos/${owner}/${repoName}/actions/workflows`;
        
//         const headers: Record<string, string> = {
//           'Accept': 'application/vnd.github.v3+json',
//         };
        
//         if (token) {
//           headers['Authorization'] = `token ${token}`;
//         }
        
//         // Prepare for tracking actual workflow definitions
//         let workflowDefinitions: WorkflowDefinition[] = [];
        
//         try {
//           const workflowsResponse = await fetch(workflowsApiUrl, { headers });
          
//           if (workflowsResponse.ok) {
//             const workflowsData = await workflowsResponse.json();
//             workflowDefinitions = workflowsData.workflows || [];
//           } else {
//             logger.error(`Failed to fetch workflow definitions for ${repoName}: ${workflowsResponse.statusText}`);
//           }
//         } catch (error: any) {
//           logger.error(`Error fetching workflow definitions for ${repoName}: ${error.message}`);
//         }

//         // Prepare API URL with parameters to better match GitHub UI behavior
//         // Set per_page to 100 to get more results (max allowed by GitHub API)
//         const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/actions/runs?branch=main&per_page=100`;
        
//         try {
//           // Fetch workflow data from GitHub API
//           logger.debug(`Fetching GitHub Actions for: ${apiUrl}`);
          
//           // We'll implement pagination to get all results
//           let page = 1;
//           let hasMorePages = true;
//           let allRuns: WorkflowRun[] = [];
//           const maxPages = 30; // Ensure we get all workflow runs
          
//           // Loop through paginated results until we have everything
//           while (hasMorePages && page <= maxPages) {
//             const pageUrl = `${apiUrl}&page=${page}`;
            
//             const response = await fetch(pageUrl, {
//               method: 'GET',
//               headers,
//             });

//             if (!response.ok) {
//               logger.error(`Failed to fetch data for ${repoName}: ${response.statusText}`);
//               break;
//             }

//             const data = await response.json();
//             const pageRuns = data.workflow_runs as WorkflowRun[];
            
//             // Add this page's runs to our collection
//             allRuns = [...allRuns, ...pageRuns];
            
//             // Check if we need to fetch more pages
//             if (pageRuns.length < 100) {
//               hasMorePages = false;
//             } else {
//               // Check for Link header with 'next' relation to confirm more pages
//               const linkHeader = response.headers.get('Link');
//               hasMorePages = linkHeader ? linkHeader.includes('rel="next"') : false;
//             }
            
//             page++;
//           }
          
//           // If no runs found, return early with empty data
//           if (allRuns.length === 0) {
//             return {
//               entity: {
//                 kind: entity.kind,
//                 namespace: entity.metadata.namespace || 'default',
//                 name: entity.metadata.name,
//               },
//               facts: {
//                 totalWorkflowRunsCount: 0,
//                 uniqueWorkflowsCount: workflowDefinitions.length, // Use actual definition count
//                 successWorkflowRunsCount: 0,
//                 failureWorkflowRunsCount: 0,
//                 successRate: 0,
//               } as PipelineStatusSummary,
//             } as TechInsightFact;
//           }
          
//           // Filter for only main branch runs
//           const mainBranchRuns = allRuns.filter(run => run.head_branch === 'main');
//           allRuns = mainBranchRuns;

//           // Count all workflow runs on main branch
//           const totalWorkflowRunsCount = allRuns.length;
          
//           // The GitHub UI counts unique workflows based on the YAML files (workflow definitions)
//           const uniqueWorkflowsCount = workflowDefinitions.length > 0 
//             ? workflowDefinitions.length 
//             : new Set(allRuns.map(run => run.workflow_id)).size;
          
//           // Count successful and failed runs
//           const successWorkflowRunsCount = allRuns.filter(
//             run => run.status === 'completed' && run.conclusion === 'success'
//           ).length;
          
//           const failureWorkflowRunsCount = allRuns.filter(
//             run => run.status === 'completed' && run.conclusion === 'failure'
//           ).length;

//           // Calculate success rate
//           const completedRuns = successWorkflowRunsCount + failureWorkflowRunsCount;
//           const successRate = completedRuns > 0 
//             ? Math.round((successWorkflowRunsCount / completedRuns) * 100) 
//             : 0;

//           // Create summary object
//           const pipelineSummary: PipelineStatusSummary = {
//             totalWorkflowRunsCount,
//             uniqueWorkflowsCount,
//             successWorkflowRunsCount,
//             failureWorkflowRunsCount,
//             successRate,
//           };

//           // Log comprehensive pipeline summary
//           logger.info(`📊 Foundation Pipelines Summary for ${repoName}:
// - Total workflow runs (main branch): ${totalWorkflowRunsCount}
// - Unique workflows: ${uniqueWorkflowsCount}
// - Success workflow runs: ${successWorkflowRunsCount}
// - Failure workflow runs: ${failureWorkflowRunsCount}
// - Workflow success rate: ${successRate}%`);

//           // Return the fact result object for this repository
//           return {
//             entity: {
//               kind: entity.kind,
//               namespace: entity.metadata.namespace || 'default',
//               name: entity.metadata.name,
//             },
//             facts: pipelineSummary,
//           } as TechInsightFact;
//         } catch (error: any) {
//           logger.error(`Error fetching pipeline data for ${owner}/${repoName}: ${error.message}`);
//           return null;
//         }
//       }),
//     );

//     // Filter null results and ensure they match TechInsightFact type
//     const validResults = results.filter((r): r is TechInsightFact => r !== null);
//     return validResults;
//   },
// };

/**
 * This file reads a GitHub token from config, fetches GitHub Actions workflow data for repositories
 * Returns pipeline statuses in a structured way that Tech Insights can consume
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

// Added type for workflow definition from the GitHub API
type WorkflowDefinition = {
  id: number;
  name: string;
  path: string;
};

// Type for per-workflow metrics
type WorkflowMetrics = {
  name: string;
  totalRuns: number;
  successRuns: number;
  failureRuns: number;
  successRate: number;
};

// Storing the facts as a JSON object
interface PipelineStatusSummary extends JsonObject {
  totalWorkflowRunsCount: number;       
  uniqueWorkflowsCount: number;         
  successWorkflowRunsCount: number;     
  failureWorkflowRunsCount: number;
  successRate: number;                  
  workflowMetrics: Record<string, WorkflowMetrics>; // Added per-workflow metrics
}

/**
 * This FactRetriever queries GitHub Actions workflow data for specified repositories
 * and returns detailed pipeline status information for all workflows
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
      description: 'Number of unique workflows that have runs (matching GitHub UI)',
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

    logger.info(`Processing ${githubEntities.length} GitHub entities`);

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

        // First, fetch workflow definitions to get an accurate count of unique workflows
        const workflowsApiUrl = `https://api.github.com/repos/${owner}/${repoName}/actions/workflows`;
        
        const headers: Record<string, string> = {
          'Accept': 'application/vnd.github.v3+json',
        };
        
        if (token) {
          headers['Authorization'] = `token ${token}`;
        }
        
        // Prepare for tracking actual workflow definitions
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

        // Prepare API URL with parameters to better match GitHub UI behavior
        // Set per_page to 100 to get more results (max allowed by GitHub API)
        const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/actions/runs?branch=main&per_page=100`;
        
        try {
          // Fetch workflow data from GitHub API
          logger.debug(`Fetching GitHub Actions for: ${apiUrl}`);
          
          // We'll implement pagination to get all results
          let page = 1;
          let hasMorePages = true;
          let allRuns: WorkflowRun[] = [];
          const maxPages = 30; // Ensure we get all workflow runs
          
          // Loop through paginated results until we have everything
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
            
            // Add this page's runs to our collection
            allRuns = [...allRuns, ...pageRuns];
            
            // Check if we need to fetch more pages
            if (pageRuns.length < 100) {
              hasMorePages = false;
            } else {
              // Check for Link header with 'next' relation to confirm more pages
              const linkHeader = response.headers.get('Link');
              hasMorePages = linkHeader ? linkHeader.includes('rel="next"') : false;
            }
            
            page++;
          }
          
          // Filter for only main branch runs
          const mainBranchRuns = allRuns.filter(run => run.head_branch === 'main');
          allRuns = mainBranchRuns;
          
          // If no runs found, return early with empty data
          if (allRuns.length === 0) {
            return {
              entity: {
                kind: entity.kind,
                namespace: entity.metadata.namespace || 'default',
                name: entity.metadata.name,
              },
              facts: {
                totalWorkflowRunsCount: 0,
                uniqueWorkflowsCount: workflowDefinitions.length, // Use actual definition count
                successWorkflowRunsCount: 0,
                failureWorkflowRunsCount: 0,
                successRate: 0,
                workflowMetrics: {},
              } as PipelineStatusSummary,
            } as TechInsightFact;
          }

          // Count all workflow runs on main branch
          const totalWorkflowRunsCount = allRuns.length;
          
          // The GitHub UI counts unique workflows based on the YAML files (workflow definitions)
          const uniqueWorkflowsCount = workflowDefinitions.length > 0 
            ? workflowDefinitions.length 
            : new Set(allRuns.map(run => run.workflow_id)).size;
          
          // Count successful and failed runs
          const successWorkflowRunsCount = allRuns.filter(
            run => run.status === 'completed' && run.conclusion === 'success'
          ).length;
          
          const failureWorkflowRunsCount = allRuns.filter(
            run => run.status === 'completed' && run.conclusion === 'failure'
          ).length;

          // Calculate success rate
          const completedRuns = successWorkflowRunsCount + failureWorkflowRunsCount;
          const successRate = completedRuns > 0 
            ? Math.round((successWorkflowRunsCount / completedRuns) * 100) 
            : 0;

          // Create a dictionary of per-workflow metrics
          const workflowMetrics: Record<string, WorkflowMetrics> = {};
          
          // Create a mapping of workflow IDs to names
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
            // Get workflow name from ID, or use ID as string if not found
            const workflowName = workflowIdToName.get(workflowId) || 
                                 runs[0]?.name || 
                                 `workflow-${workflowId}`;
            
            const totalRuns = runs.length;
            const successRuns = runs.filter(run => 
              run.status === 'completed' && run.conclusion === 'success'
            ).length;
            const failureRuns = runs.filter(run => 
              run.status === 'completed' && run.conclusion === 'failure'
            ).length;
            
            const workflowCompletedRuns = successRuns + failureRuns;
            const workflowSuccessRate = workflowCompletedRuns > 0 
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

          // Create summary object
          const pipelineSummary: PipelineStatusSummary = {
            totalWorkflowRunsCount,
            uniqueWorkflowsCount,
            successWorkflowRunsCount,
            failureWorkflowRunsCount,
            successRate,
            workflowMetrics,
          };

          // Log comprehensive pipeline summary
          logger.info(`📊 Foundation Pipelines Summary for ${repoName}:
- Total workflow runs (main branch): ${totalWorkflowRunsCount}
- Unique workflows: ${uniqueWorkflowsCount}
- Success workflow runs: ${successWorkflowRunsCount}
- Failure workflow runs: ${failureWorkflowRunsCount}
- Workflow success rate: ${successRate}%`);

          // Log detailed metrics for each workflow
          logger.info(`📋 Per-Workflow Metrics for ${repoName}:`);
          Object.values(workflowMetrics).forEach(metrics => {
            logger.info(`- Workflow: ${metrics.name}
  • Total runs: ${metrics.totalRuns}
  • Success runs: ${metrics.successRuns}
  • Failure runs: ${metrics.failureRuns}
  • Success rate: ${metrics.successRate}%`);
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