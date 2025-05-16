/**
 * This file reads a GitHub token from config, fetches GitHub Actions workflow data for repositories
 * Returns pipeline statuses in a structured way that Tech Insights can consume
 */
import { FactRetriever, TechInsightFact } from '@backstage-community/plugin-tech-insights-node';
import { CatalogClient } from '@backstage/catalog-client';
import { JsonObject } from '@backstage/types';

// Types from the original pipeline code
type WorkflowConfig = {
  exclude: string[];
  critical: string[];
  sampleIfNoCritical: number;
};

type WorkflowRun = {
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;  // Adding created_at field for timestamp comparisons
  head_branch: string; // Adding head_branch to confirm we're looking at the right branch
  workflow_id: number; // Adding workflow_id to better identify unique workflows
};

// The main result structure as a JsonObject compatible type
interface PipelineStatusSummary extends JsonObject {
  totalWorkflowRunsCount: number;       // All workflow runs on main branch (including excluded)
  uniqueWorkflowsCount: number;         // Number of unique workflows (matching GitHub UI)
  successWorkflowRunsCount: number;     // Successful workflow runs (excluding excluded workflows)
  failureWorkflowRunsCount: number;     // Failed workflow runs (excluding excluded workflows)
  criticalFailureRunsCount: number;     // Failed critical workflow runs
  criticalSuccessRunsCount: number;     // Successful critical workflow runs
}

/**
 * Takes the first N items from an array without shuffling
 * (replacing the shuffleArray function to have more consistent results)
 */
function takeFirstN(array: string[], n: number): string[] {
  return array.slice(0, n);
}

/**
 * This FactRetriever queries GitHub Actions workflow data for specified repositories
 * and returns detailed pipeline status information
 */
export const githubPipelineStatusFactRetriever: FactRetriever = {
  // Identifier for this fact retriever
  id: 'githubPipelineStatusFactRetriever',
  // Versioning information for this retriever
  version: '0.1.0',
  // Entity filter to specify which entities this retriever applies to
  entityFilter: [{ kind: 'component' }],
  // Defines the structure of the facts returned
  schema: {
    totalWorkflowRunsCount: {
      type: 'integer',
      description: 'Total number of workflow runs on main branch (including excluded)',
    },
    uniqueWorkflowsCount: {
      type: 'integer',
      description: 'Number of unique workflows that have runs (matching GitHub UI)',
    },
    successWorkflowRunsCount: {
      type: 'integer',
      description: 'Number of successful workflow runs (excluding excluded workflows)',
    },
    failureWorkflowRunsCount: {
      type: 'integer',
      description: 'Number of failed workflow runs (excluding excluded workflows)',
    },
    criticalFailureRunsCount: {
      type: 'integer',
      description: 'Number of failed critical workflow runs',
    },
    criticalSuccessRunsCount: {
      type: 'integer',
      description: 'Number of successful critical workflow runs',
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

        // Extract workflow configuration from entity spec with proper type safety
        const entityWorkflowConfig = entity.spec?.workflowConfig as 
          | { exclude?: string[]; critical?: string[]; sampleIfNoCritical?: number }
          | undefined;
          
        // Then extract values with defaults
        const workflowConfig: WorkflowConfig = {
          exclude: Array.isArray(entityWorkflowConfig?.exclude) ? entityWorkflowConfig.exclude : [],
          critical: Array.isArray(entityWorkflowConfig?.critical) ? entityWorkflowConfig.critical : [],
          sampleIfNoCritical: typeof entityWorkflowConfig?.sampleIfNoCritical === 'number' ? 
            entityWorkflowConfig.sampleIfNoCritical : 3,
        };

        console.log("!!!!!!!!!!!!!!!workflowconfig!!!!!!!!!!!!!!!!!", workflowConfig)

        // First, fetch workflow definitions to get an accurate count of unique workflows
        const workflowsApiUrl = `https://api.github.com/repos/${owner}/${repoName}/actions/workflows`;
        
        const headers: Record<string, string> = {
          'Accept': 'application/vnd.github.v3+json',
        };
        
        if (token) {
          headers['Authorization'] = `token ${token}`;
        }
        
        // Prepare for tracking actual workflow definitions
        let workflowDefinitions: { id: number; name: string; path: string }[] = [];
        
        try {
          const workflowsResponse = await fetch(workflowsApiUrl, { headers });
          
          if (workflowsResponse.ok) {
            const workflowsData = await workflowsResponse.json();
            workflowDefinitions = workflowsData.workflows || [];
            console.log(`Number of workflow definitions in ${repoName}: ${workflowDefinitions.length}`);
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
          const maxPages = 30; // Increase max pages to ensure we get all workflow runs
          
          // Loop through paginated results until we have everything
          while (hasMorePages && page <= maxPages) {
            const pageUrl = `${apiUrl}&page=${page}`;
            console.log(`Fetching page ${page} for ${repoName}...`);
            
            const response = await fetch(pageUrl, {
              method: 'GET',
              headers,
            });

            if (!response.ok) {
              console.log(`Failed to fetch data for ${repoName} (page ${page}): ${response.status} ${response.statusText}`);
              logger.error(`Failed to fetch data for ${repoName}: ${response.statusText}`);
              break;
            }

            const data = await response.json();
            const pageRuns = data.workflow_runs as WorkflowRun[];
            
            console.log(`Retrieved ${pageRuns.length} workflow runs from page ${page}`);
            
            // Add this page's runs to our collection
            allRuns = [...allRuns, ...pageRuns];
            
            // Check if we need to fetch more pages
            // If we got fewer results than the per_page limit or GitHub indicates no more pages, we're done
            if (pageRuns.length < 100) {
              hasMorePages = false;
              console.log(`Reached end of results on page ${page} with ${pageRuns.length} results`);
            } else {
              // Check for Link header with 'next' relation to confirm more pages
              const linkHeader = response.headers.get('Link');
              hasMorePages = linkHeader ? linkHeader.includes('rel="next"') : false;
              
              if (!hasMorePages) {
                console.log(`No more pages indicated by Link header on page ${page}`);
              }
            }
            
            page++;
          }
          
          if (page > maxPages) {
            console.log(`Reached maximum page limit (${maxPages}) for ${repoName}. Showing first ${allRuns.length} workflow runs.`);
          }
          
          console.log(`Total workflow runs fetched after pagination for ${repoName}: ${allRuns.length}`);
          
          // If no runs found, return early with empty data
          if (allRuns.length === 0) {
            console.log(`No workflow runs found for ${repoName}`);
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
                criticalFailureRunsCount: 0,
                criticalSuccessRunsCount: 0,
              } as PipelineStatusSummary,
            } as TechInsightFact;
          }
          
          // Filter runs to ensure they're on main branch (as the API parameter is sometimes not respected)
          console.log(`Filtering to ensure only main branch runs are counted...`);
          const mainBranchRuns = allRuns.filter(run => run.head_branch === 'main');
          console.log(`Main branch runs: ${mainBranchRuns.length} out of ${allRuns.length} total runs`);
          
          // Use mainBranchRuns for all further processing
          allRuns = mainBranchRuns;

          // Count all workflow runs on main branch (including excluded ones)
          const totalWorkflowRunsCount = allRuns.length;
          
          // The GitHub UI counts unique workflows based on the YAML files (workflow definitions)
          // We'll use our fetched workflow definitions count, but if that failed, use unique names as fallback
          const uniqueWorkflowsCount = workflowDefinitions.length > 0 
            ? workflowDefinitions.length 
            : new Set(allRuns.map(run => run.workflow_id)).size;
          
          console.log(`Number of unique workflows: ${uniqueWorkflowsCount}`);
          
          // Count non-excluded workflow runs - ALL OF THEM, not just recent ones
          // This gives all workflow runs that aren't in the exclude list
          const nonExcludedRuns = allRuns.filter(run => !workflowConfig.exclude.includes(run.name));
          
          // Count successful and failed runs among the non-excluded runs
          // Make sure to consider all possible conclusion statuses
          const successWorkflowRunsCount = nonExcludedRuns.filter(
            run => run.status === 'completed' && run.conclusion === 'success'
          ).length;
          
          const failureWorkflowRunsCount = nonExcludedRuns.filter(
            run => run.status === 'completed' && run.conclusion === 'failure'
          ).length;

          // Determine critical workflows based on config
          let criticalWorkflows: string[];
          if (workflowConfig.critical.length > 0) {
            criticalWorkflows = workflowConfig.critical;
          } else {
            // Get unique workflow names excluding excluded ones
            const allWorkflowNames = [...new Set(allRuns.map(run => run.name))].filter(
              name => !workflowConfig.exclude.includes(name)
            );
            criticalWorkflows = takeFirstN(allWorkflowNames, workflowConfig.sampleIfNoCritical);
          }

          // Fetch all workflow runs for all critical workflows separately to ensure we get ALL runs
          // This is more reliable than relying on pagination for the main branch runs
          const criticalWorkflowPromises = criticalWorkflows.map(async (workflowName) => {
            console.log(`Fetching all runs for critical workflow: ${workflowName}`);
            // Find the workflow ID for this workflow name
            const workflowId = workflowDefinitions.find(wd => wd.name === workflowName)?.id;
            
            if (!workflowId) {
              console.log(`Could not find workflow ID for ${workflowName}, using filtered runs from main query`);
              // If we can't find the workflow ID, use the runs we already have for this workflow
              return allRuns.filter(run => run.name === workflowName);
            }
            
            // Fetch all runs for this specific workflow
            const workflowRunsUrl = `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/${workflowId}/runs?branch=main&per_page=100`;
            
            try {
              let workflowPage = 1;
              let workflowHasMorePages = true;
              let workflowRuns: WorkflowRun[] = [];
              
              while (workflowHasMorePages && workflowPage <= maxPages) {
                const pageUrl = `${workflowRunsUrl}&page=${workflowPage}`;
                console.log(`Fetching page ${workflowPage} for critical workflow ${workflowName}...`);
                
                const response = await fetch(pageUrl, {
                  method: 'GET',
                  headers,
                });
                
                if (!response.ok) {
                  console.log(`Failed to fetch data for critical workflow ${workflowName} (page ${workflowPage}): ${response.status} ${response.statusText}`);
                  break;
                }
                
                const data = await response.json();
                const pageRuns = data.workflow_runs as WorkflowRun[];
                
                console.log(`Retrieved ${pageRuns.length} runs from page ${workflowPage} for critical workflow ${workflowName}`);
                
                // Add this page's runs to our collection
                workflowRuns = [...workflowRuns, ...pageRuns];
                
                // Check if we need to fetch more pages
                if (pageRuns.length < 100) {
                  workflowHasMorePages = false;
                } else {
                  // Check for Link header with 'next' relation
                  const linkHeader = response.headers.get('Link');
                  workflowHasMorePages = linkHeader ? linkHeader.includes('rel="next"') : false;
                }
                
                workflowPage++;
              }
              
              console.log(`Total runs for critical workflow ${workflowName}: ${workflowRuns.length}`);
              return workflowRuns.filter(run => run.head_branch === 'main');
              
            } catch (error: any) {
              console.log(`Error fetching runs for critical workflow ${workflowName}: ${error.message}`);
              // Fallback to the runs we already have for this workflow
              return allRuns.filter(run => run.name === workflowName);
            }
          });
          
          // Wait for all critical workflow run queries and combine results
          const criticalWorkflowRuns = await Promise.all(criticalWorkflowPromises);
          
          // Flatten all individual workflow runs arrays into one
          const allCriticalRuns: WorkflowRun[] = criticalWorkflowRuns.flat();
          
          console.log(`Total critical workflow runs from dedicated queries: ${allCriticalRuns.length}`);
          
          // Count successes and failures among all critical runs
          const criticalSuccessRunsCount = allCriticalRuns.filter(
            run => run.status === 'completed' && run.conclusion === 'success'
          ).length;
          
          const criticalFailureRunsCount = allCriticalRuns.filter(
            run => run.status === 'completed' && run.conclusion === 'failure'
          ).length;
          
          console.log(`Critical success runs: ${criticalSuccessRunsCount}, Critical failure runs: ${criticalFailureRunsCount}`);

          // Create summary object
          const pipelineSummary: PipelineStatusSummary = {
            totalWorkflowRunsCount,
            uniqueWorkflowsCount,
            successWorkflowRunsCount,
            failureWorkflowRunsCount,
            criticalFailureRunsCount, 
            criticalSuccessRunsCount,
          };

          // Log comprehensive pipeline summary
          console.log(`📊 Pipeline Status Summary for ${repoName}:`);
          console.log(`- Total workflow runs (all): ${totalWorkflowRunsCount}`);
          console.log(`- Unique workflows: ${uniqueWorkflowsCount}`);
          console.log(`- Success workflow runs (excluding excluded workflow runs): ${successWorkflowRunsCount}`);
          console.log(`- Failure workflow runs (excluding excluded workflow runs): ${failureWorkflowRunsCount}`);
          console.log(`- Critical workflow runs (success): ${criticalSuccessRunsCount}`);
          console.log(`- Critical workflow runs (failure): ${criticalFailureRunsCount}`);
          
          // Additional diagnostics
          console.log(`- Excluded workflow runs: ${allRuns.filter(run => workflowConfig.exclude.includes(run.name)).length}`);
          console.log(`- Critical workflows configured: ${criticalWorkflows.length}`);
          console.log(`- Critical workflow names: ${criticalWorkflows.join(', ')}`);
          console.log(`- Workflow success rate: ${Math.round((successWorkflowRunsCount / (successWorkflowRunsCount + failureWorkflowRunsCount || 1)) * 100)}%`);
          console.log(`- Critical workflow success rate: ${Math.round((criticalSuccessRunsCount / (criticalSuccessRunsCount + criticalFailureRunsCount || 1)) * 100)}%`);

          // Count in-progress runs
          const inProgressCount = nonExcludedRuns.filter(run => run.status !== 'completed').length;
          console.log(`- In progress workflow runs: ${inProgressCount}`);
          
          // Count critical in-progress runs
          const criticalInProgressCount = allCriticalRuns.filter(run => run.status !== 'completed').length;
          console.log(`- Critical in progress workflow runs: ${criticalInProgressCount}`);

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

// ... omitted import statements and types for brevity (retain from your original code)

// export const githubPipelineStatusFactRetriever: FactRetriever = {
//   id: 'githubPipelineStatusFactRetriever',
//   version: '0.1.0',
//   entityFilter: [{ kind: 'component' }],
//   schema: {
//     totalWorkflowRunsCount: { type: 'integer', description: 'Total workflow runs (all)' },
//     uniqueWorkflowsCount: { type: 'integer', description: 'Unique workflows' },
//     successWorkflowRunsCount: { type: 'integer', description: 'Success workflow runs (excluding excluded)' },
//     failureWorkflowRunsCount: { type: 'integer', description: 'Failure workflow runs (excluding excluded)' },
//     criticalSuccessRunsCount: { type: 'integer', description: 'Critical workflow runs (success)' },
//     criticalFailureRunsCount: { type: 'integer', description: 'Critical workflow runs (failure)' },
//     excludedWorkflowRunsCount: { type: 'integer', description: 'Excluded workflow runs' },
//     workflowSuccessRate: { type: 'float', description: 'Workflow success rate (%)' },
//     criticalWorkflowSuccessRate: { type: 'float', description: 'Critical workflow success rate (%)' },
//   },

//   async handler({ config, logger, entityFilter, auth, discovery }): Promise<TechInsightFact[]> {
//     let token: string | undefined;
//     try {
//       const githubConfigs = config.getOptionalConfigArray('integrations.github');
//       token = githubConfigs?.[0]?.getOptionalString('token');
//     } catch (e) {
//       logger.error(`Could not retrieve GitHub token: ${e}`);
//       return [];
//     }

//     const { token: catalogToken } = await auth.getPluginRequestToken({
//       onBehalfOf: await auth.getOwnServiceCredentials(),
//       targetPluginId: 'catalog',
//     });

//     const catalogClient = new CatalogClient({ discoveryApi: discovery });
//     const { items: entities } = await catalogClient.getEntities({ filter: entityFilter }, { token: catalogToken });

//     const githubEntities = entities.filter(entity => !!entity.metadata.annotations?.['github.com/project-slug']);

//     const results = await Promise.all(
//       githubEntities.map(async entity => {
//         const projectSlug = entity.metadata.annotations!['github.com/project-slug'];
//         const [owner, repoName] = projectSlug.split('/');

//         const config = entity.spec?.workflowConfig as WorkflowConfig || {
//           exclude: [],
//           critical: [],
//           sampleIfNoCritical: 3,
//         };

//         const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
//         if (token) headers['Authorization'] = `token ${token}`;

//         const workflowsResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/actions/workflows`, { headers });
//         const workflowsData = await workflowsResponse.json();
//         const workflowDefinitions = workflowsData.workflows || [];

//         let allRuns: WorkflowRun[] = [];
//         let page = 1;
//         while (true) {
//           const runsRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/actions/runs?branch=main&per_page=100&page=${page}`, { headers });
//           const data = await runsRes.json();
//           const runs = data.workflow_runs as WorkflowRun[];
//           if (!runs.length) break;
//           allRuns.push(...runs);
//           page++;
//         }

//         const totalWorkflowRunsCount = allRuns.length;
//         const uniqueWorkflowIds = new Set(allRuns.map(run => run.workflow_id));
//         const uniqueWorkflowsCount = uniqueWorkflowIds.size;

//         const excludedSet = new Set(config.exclude);
//         const criticalSet = new Set(config.critical);

//         let successWorkflowRunsCount = 0;
//         let failureWorkflowRunsCount = 0;
//         let excludedWorkflowRunsCount = 0;
//         let criticalSuccessRunsCount = 0;
//         let criticalFailureRunsCount = 0;

//         for (const run of allRuns) {
//           const isExcluded = excludedSet.has(run.name);
//           const isCritical = criticalSet.has(run.name);

//           if (isExcluded) {
//             excludedWorkflowRunsCount++;
//             continue;
//           }

//           const isSuccess = run.conclusion === 'success';

//           if (isSuccess) {
//             successWorkflowRunsCount++;
//             if (isCritical) criticalSuccessRunsCount++;
//           } else {
//             failureWorkflowRunsCount++;
//             if (isCritical) criticalFailureRunsCount++;
//           }
//         }

//         const workflowSuccessRate =
//           successWorkflowRunsCount + failureWorkflowRunsCount > 0
//             ? (successWorkflowRunsCount / (successWorkflowRunsCount + failureWorkflowRunsCount)) * 100
//             : 0;

//         const totalCritical = criticalSuccessRunsCount + criticalFailureRunsCount;
//         const criticalWorkflowSuccessRate =
//           totalCritical > 0 ? (criticalSuccessRunsCount / totalCritical) * 100 : 0;

//         const result = {
//           entity: {
//             kind: entity.kind,
//             namespace: entity.metadata.namespace || 'default',
//             name: entity.metadata.name,
//           },
//           facts: {
//             totalWorkflowRunsCount,
//             uniqueWorkflowsCount,
//             successWorkflowRunsCount,
//             failureWorkflowRunsCount,
//             criticalSuccessRunsCount,
//             criticalFailureRunsCount,
//             excludedWorkflowRunsCount,
//             workflowSuccessRate,
//             criticalWorkflowSuccessRate,
//           },
//         };

//         // ✅ Console output for verification
//         console.log(`📊 Pipeline summary for ${projectSlug}:`, result.facts);

//         return result;
//       })
//     );

//     return results.filter((r): r is NonNullable<typeof r> => r !== null);
//   },
// };
