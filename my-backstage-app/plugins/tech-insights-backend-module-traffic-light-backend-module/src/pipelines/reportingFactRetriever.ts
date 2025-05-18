/**
 * This file reads a GitHub token from config, fetches GitHub repos and checks Docker build status
 * Returns Docker build results in a structured way that Tech Insights can consume
 * Focused solely on Docker build checks without requiring repository cloning
 */
import { FactRetriever, TechInsightFact } from '@backstage-community/plugin-tech-insights-node';
import { CatalogClient } from '@backstage/catalog-client';
import { JsonObject } from '@backstage/types';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import AdmZip from 'adm-zip';

// Promisify exec for async/await usage
const execAsync = promisify(exec);

// Docker build check result type
type DockerBuildResult = {
  repository: string;
  success: boolean;
  errorMessage: string | null;
  buildTime: number | null; // build time in milliseconds
  healthStatus: string;
  fileExists: boolean;
};

// The main result structure as a JsonObject compatible type
interface DockerBuildStatusSummary extends JsonObject {
  dockerfileChecksSuccess: boolean;   // Special flag for Dockerfile checks
  dockerBuildResult: DockerBuildResult; // Docker build check results
}

/**
 * Performs a Docker build test for the specified repository without cloning
 * 
 * @param owner - The GitHub repository owner
 * @param repoName - The GitHub repository name
 * @param token - GitHub token for API access
 * @param logger - Logger instance for logging messages
 * @returns Promise with Docker build result
 */
async function testDockerBuild(
  owner: string,
  repoName: string,
  token: string | undefined,
  logger: any
): Promise<DockerBuildResult> {
  const result: DockerBuildResult = {
    repository: `${owner}/${repoName}`,
    success: false,
    errorMessage: null,
    buildTime: null,
    healthStatus: 'unknown',
    fileExists: false,
  };

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3.raw',
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    // Step 1: Get list of branches
    const branchesUrl = `https://api.github.com/repos/${owner}/${repoName}/branches`;
    const branchesRes = await fetch(branchesUrl, { headers });

    if (!branchesRes.ok) {
      throw new Error(`Failed to fetch branches: ${branchesRes.statusText}`);
    }

    const branchesData = await branchesRes.json();
    const branchNames = branchesData.map((b: any) => b.name);

    logger.info(`Found branches: ${branchNames.join(', ')}`);

    // Step 2: Find the branch that contains a Dockerfile
    let branchWithDockerfile: string | null = null;

    for (const branch of branchNames) {
      const dockerfileCheckUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/Dockerfile?ref=${branch}`;
      const res = await fetch(dockerfileCheckUrl, {
        method: 'GET',
        headers: { ...headers, Accept: 'application/vnd.github.v3+json' },
      });

      if (res.ok) {
        branchWithDockerfile = branch;
        result.fileExists = true;
        logger.info(`Found Dockerfile in branch: ${branch}`);
        break;
      }
    }

    if (!branchWithDockerfile) {
      result.errorMessage = 'No Dockerfile found in any branch';
      result.healthStatus = 'Unhealthy - No Dockerfile found';
      logger.warn(result.errorMessage);
      return result;
    }

    // Step 3: Download the ZIP archive from the correct branch
    const archiveUrl = `https://api.github.com/repos/${owner}/${repoName}/zipball/${branchWithDockerfile}`;
    logger.info(`Downloading repo ZIP from: ${archiveUrl}`);

    const archiveRes = await fetch(archiveUrl, { headers });
    if (!archiveRes.ok) {
      throw new Error(`Failed to download repo zip: ${archiveRes.statusText}`);
    }

    const buffer = Buffer.from(await archiveRes.arrayBuffer());
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docker-fullcheck-'));
    const zipPath = path.join(tmpDir, 'repo.zip');
    fs.writeFileSync(zipPath, buffer);

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tmpDir, true);

    const extractedDirs = fs.readdirSync(tmpDir).filter(f =>
      fs.statSync(path.join(tmpDir, f)).isDirectory()
    );
    const buildContextDir = path.join(tmpDir, extractedDirs[0]);

    logger.info(`Extracted repo into: ${buildContextDir}`);
    logger.info(`Build context files: ${fs.readdirSync(buildContextDir).join(', ')}`);

    // Step 4: Build Docker image
    const imageName = `${repoName}-test:latest`;
    const startBuildTime = Date.now();

    await execAsync(`docker build -t ${imageName} -f Dockerfile .`, { cwd: buildContextDir });

    const buildTime = Date.now() - startBuildTime;
    result.buildTime = buildTime;
    result.success = true;
    result.healthStatus = 'Healthy - Build successful';

    logger.info(`Docker build succeeded in ${buildTime}ms`);

    // Step 5: Test container run
    try {
      logger.info(`Running test container for image...`);
      await execAsync(`docker run --rm ${imageName} echo "Container started successfully"`);
      result.healthStatus = 'Healthy - Container runs successfully';
    } catch (runError: any) {
      result.healthStatus = `Image builds but fails to run: ${runError.message.substring(0, 100)}`;
      logger.warn(`Docker image built but failed to run`);
    }

    // Step 6: Cleanup
    try {
      await execAsync(`docker image rm ${imageName}`);
    } catch {
      logger.warn(`Failed to remove test Docker image`);
    }

    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      logger.warn(`Failed to clean up temp directory`);
    }

  } catch (error: any) {
    result.success = false;
    result.errorMessage = error.message;
    result.healthStatus = `Unhealthy - Build failed: ${error.message.substring(0, 100)}`;
    logger.error(`Docker build failed for ${owner}/${repoName}: ${error.message}`);
  }

  return result;
}


/**
 * This FactRetriever checks Docker build status for all repositories with GitHub integration
 * and returns Docker build status information for each repository
 */
export const githubReportingPipelineStatusFactRetriever: FactRetriever = {
  // Identifier for this fact retriever
  id: 'githubDockerBuildStatusFactRetriever',
  // Versioning information for this retriever
  version: '1.0.0',
  // Entity filter to specify which entities this retriever applies to
  entityFilter: [{ kind: 'component' }],
  // Defines the structure of the facts returned
  schema: {
    dockerfileChecksSuccess: {
      type: 'boolean',
      description: 'Whether the Dockerfile check is successful',
    },
    dockerBuildResult: {
      type: 'object',
      description: 'Results from testing Docker build functionality',
    },
  },

  // Main logic of the retriever
  async handler(params): Promise<TechInsightFact[]> {
    const { config, logger, entityFilter, auth, discovery } = params;
    
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

    logger.info(`Found ${githubEntities.length} GitHub entities to check for Docker builds`);

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

        console.log(`🐳 [${repoName}] Performing Docker build check...`);
        
        // Execute the Docker build test without cloning
        const dockerBuildResult = await testDockerBuild(owner, repoName, token, logger);
        
        // Simple log for Docker build result
        console.log(`🐳 [${repoName}] Docker build check: ${dockerBuildResult.success ? 'SUCCESS' : 'FAILURE'}`);
        if (!dockerBuildResult.success && dockerBuildResult.errorMessage) {
          console.log(`🐳 [${repoName}] Error: ${dockerBuildResult.errorMessage}`);
        }
        console.log(`🐳 [${repoName}] Health: ${dockerBuildResult.healthStatus}`);
        if (dockerBuildResult.buildTime) {
          console.log(`🐳 [${repoName}] Build time: ${dockerBuildResult.buildTime}ms`);
        }

        // Create Docker build status summary
        const dockerBuildSummary: DockerBuildStatusSummary = {
          dockerfileChecksSuccess: dockerBuildResult.success,
          dockerBuildResult: dockerBuildResult,
        };

        // Return the fact result object for this repository
        return {
          entity: {
            kind: entity.kind,
            namespace: entity.metadata.namespace || 'default',
            name: entity.metadata.name,
          },
          facts: dockerBuildSummary,
        } as TechInsightFact;
      }),
    );

    // Filter null results and ensure they match TechInsightFact type
    const validResults = results.filter((r): r is TechInsightFact => r !== null);
    
    // Log overall summary
    const successCount = validResults.filter(r => 
      (r.facts as DockerBuildStatusSummary).dockerfileChecksSuccess
    ).length;
    
    console.log(`🐳 Docker build checks completed: ${successCount} successful, ${validResults.length - successCount} failed`);
    
    return validResults;
  },
};