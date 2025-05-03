import { Octokit } from '@octokit/rest';
import { Config } from '@backstage/config';
import { LoggerService } from '@backstage/backend-plugin-api';

// Gets dependabot status of the repo using the GitHub token defined
export async function getDependabotStatus(
  owner: string, // GitHub user or org
  repo: string, // Repo name
  config: Config, // Backstage config object
  logger: LoggerService // Logger for diagnostics
): Promise<'green' | 'yellow' | 'red' | 'orange'> {
  // Safely read GitHub token from config
  const githubIntegrations = config.getConfigArray('integrations.github');
  const githubToken = githubIntegrations[0]?.getOptionalString('token');

  if (!githubToken) {
    logger.error('GitHub token not found in config at integrations.github[0].token');
    return 'red';
  }

  const octokit = new Octokit({ auth: githubToken });

  try {
    const prs = await octokit.pulls.list({ owner, repo, state: 'open' });

    const dependabotPRs = prs.data.filter(pr => pr.user?.login === 'dependabot[bot]');

    if (dependabotPRs.length === 0) return 'green';

    const isStale = dependabotPRs.some(pr => {
      const updatedAt = new Date(pr.updated_at);
      const diffDays = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays > 14;
    });

    return isStale ? 'red' : 'orange';
  } catch (err) {
    logger.error('Failed to fetch Dependabot PRs:', err as Error);
    return 'red';
  }
}
