/**
 * This file reads a GitHub token from config, fetches GitHub Actions workflow data for repositories
 * Returns pipeline statuses in a structured way that Tech Insights can consume
 */
import { FactRetriever, TechInsightFact } from '@backstage-community/plugin-tech-insights-node';
import { CatalogClient } from '@backstage/catalog-client';
import { JsonObject } from '@backstage/types';

// To exclude some workflows defined in the catalog entity annotations
type WorkflowConfig = {
  exclude: string[]; 
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

// Storing the facts as a JSON object
interface PipelineStatusSummary extends JsonObject {
  totalWorkflowRunsCount: number;       
  uniqueWorkflowsCount: number;         
  successWorkflowRunsCount: number;     
  failureWorkflowRunsCount: number;
  successRate: number;     
}

/**
 * This FactRetriever queries GitHub Actions workflow data for specified repositories
 * and returns detailed pipeline status information
 */
export const githubPipelineStatusFactRetriever: FactRetriever = {
  id: 'githubPipelineStatusFactRetriever',
  version: '0.1.0',
  entityFilter: [{ kind: 'component' }],
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
    successRate: {
      type: 'float',
      description: 'Success rate percentage (0-100) of workflow runs (excluding excluded workflows)',
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

        // Extract workflow configuration from entity annotations instead of spec
        logger.info(`Extracting workflow config from annotations for ${entity.metadata.name}`);
        
        const workflowConfig: WorkflowConfig = {
          exclude: [],
        };
        
        // Check if preproduction/exclude annotation exists
        const excludeAnnotation = entity.metadata.annotations?.['preproduction/exclude'];
        if (excludeAnnotation) {
          try {
            // Parse the JSON array from the annotation
            const excludeList = JSON.parse(excludeAnnotation);
            if (Array.isArray(excludeList)) {
              workflowConfig.exclude = excludeList as string[];
              console.log(`Workflows to exclude by name: [${workflowConfig.exclude.join(', ')}]`);
            } else {
              logger.warn(`preproduction/exclude annotation for ${entity.metadata.name} is not an array: ${excludeAnnotation}`);
            }
          } catch (error) {
            logger.error(`Failed to parse preproduction/exclude annotation for ${entity.metadata.name}: ${error}`);
          }
        } else {
          console.log(`No preproduction/exclude annotation found for ${entity.metadata.name} - processing all workflows`);
        }

        // First, fetch workflow definitions to get an accurate count of unique workflows
        // and to map workflow names to IDs if needed
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
            console.log(`Number of workflow definitions in ${repoName}: ${workflowDefinitions.length}`);
            
            // Log workflow definitions for reference
            workflowDefinitions.forEach(workflow => {
              console.log(`Workflow ID: ${workflow.id}, Name: "${workflow.name}", Path: ${workflow.path}`);
            });
          } else {
            logger.error(`###Failed to fetch workflow definitions for ${repoName}: ${workflowsResponse.statusText}`);
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
                successRate: 0,
              } as PipelineStatusSummary,
            } as TechInsightFact;
          }
          
          const mainBranchRuns = allRuns.filter(run => run.head_branch === 'main');
          
          // Use mainBranchRuns for all further processing
          allRuns = mainBranchRuns;

          // Count all workflow runs on main branch (including excluded ones)
          const totalWorkflowRunsCount = allRuns.length;
          
          // The GitHub UI counts unique workflows based on the YAML files (workflow definitions)
          // We'll use our fetched workflow definitions count, but if that failed, use unique workflow_ids as fallback
          const uniqueWorkflowsCount = workflowDefinitions.length > 0 
            ? workflowDefinitions.length 
            : new Set(allRuns.map(run => run.workflow_id)).size;
          
          console.log(`Number of unique workflows: ${uniqueWorkflowsCount}`);
          
          // Count non-excluded workflow runs - we only want runs that aren't in the exclude list
          // Map workflow names to workflow IDs using the workflow definitions
          const workflowNameToIdMap = new Map<string, number>();
          const excludedWorkflowIds: number[] = [];
          
          // Only process exclusions if there are workflows to exclude
          if (workflowConfig.exclude.length > 0) {
            // Build the name to ID mapping and find IDs for excluded workflow names
            if (workflowDefinitions.length > 0) {
              workflowDefinitions.forEach(workflow => {
                workflowNameToIdMap.set(workflow.name, workflow.id);
                
                // Check if this workflow name is in the exclude list
                if (workflowConfig.exclude.includes(workflow.name)) {
                  excludedWorkflowIds.push(workflow.id);
                  console.log(`Mapping excluded workflow name "${workflow.name}" to ID ${workflow.id}`);
                }
              });
            } else {
              // If we couldn't get workflow definitions, try to match by name directly in the runs
              // This is less reliable but better than nothing
              allRuns.forEach(run => {
                if (workflowConfig.exclude.includes(run.name) && !excludedWorkflowIds.some(id => id === run.workflow_id)) {
                  excludedWorkflowIds.push(run.workflow_id);
                  console.log(`Found workflow ID ${run.workflow_id} for excluded name "${run.name}" from runs`);
                }
              });
            }
            
            console.log(`Excluding workflow runs with IDs: [${excludedWorkflowIds.join(', ')}]`);
          } else {
            console.log(`No workflows to exclude - processing all workflow runs`);
          }
          
          // Filter runs based on the mapped workflow IDs from names (only if there are exclusions)
          const nonExcludedRuns = excludedWorkflowIds.length > 0 
            ? allRuns.filter(run => {
                // Use Array.some() for type-safe checking
                const shouldExclude = excludedWorkflowIds.some(id => id === run.workflow_id);
                if (shouldExclude) {
                  console.log(`Excluding run of workflow ID ${run.workflow_id} (name: "${run.name}")`);
                }
                return !shouldExclude;
              })
            : allRuns; // If no exclusions, use all runs
          
          console.log(`After exclusion: ${nonExcludedRuns.length} workflow runs remain out of ${allRuns.length} total`);
          
          // Count successful and failed runs among the non-excluded runs
          const successWorkflowRunsCount = nonExcludedRuns.filter(
            run => run.status === 'completed' && run.conclusion === 'success'
          ).length;
          
          const failureWorkflowRunsCount = nonExcludedRuns.filter(
            run => run.status === 'completed' && run.conclusion === 'failure'
          ).length;

          // Calculate success rate
          const totalCompletedRuns = successWorkflowRunsCount + failureWorkflowRunsCount;
          const successRate = totalCompletedRuns > 0 
            ? Math.round((successWorkflowRunsCount / totalCompletedRuns) * 100) 
            : 0;

          // Create summary object
          const pipelineSummary: PipelineStatusSummary = {
            totalWorkflowRunsCount,
            uniqueWorkflowsCount,
            successWorkflowRunsCount,
            failureWorkflowRunsCount,
            successRate,
          };

          // Log comprehensive pipeline summary
          console.log(`📊 Pipeline Status Summary for ${repoName}:`);
          console.log(`- Total workflow runs (all): ${totalWorkflowRunsCount}`);
          console.log(`- Unique workflows: ${uniqueWorkflowsCount}`);
          console.log(`- Success workflow runs (excluding excluded workflows): ${successWorkflowRunsCount}`);
          console.log(`- Failure workflow runs (excluding excluded workflows): ${failureWorkflowRunsCount}`);
          console.log(`- Success rate: ${successRate}%`);
          
          // Additional diagnostics
          const excludedRunsCount = excludedWorkflowIds.length > 0 
            ? allRuns.filter(run => excludedWorkflowIds.some(id => id === run.workflow_id)).length 
            : 0;
          console.log(`- Excluded workflow runs: ${excludedRunsCount}`);

          // Count in-progress runs
          const inProgressCount = nonExcludedRuns.filter(run => run.status !== 'completed').length;
          console.log(`- In progress workflow runs: ${inProgressCount}`);
          
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