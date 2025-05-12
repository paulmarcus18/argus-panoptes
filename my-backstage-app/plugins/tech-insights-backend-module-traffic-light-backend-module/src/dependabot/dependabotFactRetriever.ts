/**
 * This file reads a github token from config, uses Octokit to fetch open dependabot alerts
 * Returns the number of alerts per repo in a structured way that Tech Insights can consume
*/
//Imports the fact retriever interface, used to define structure of a custom fact retriever
import { FactRetriever } from '@backstage-community/plugin-tech-insights-node';
//LoggerService is used to log messages and errors
import { LoggerService } from '@backstage/backend-plugin-api';
//Imports config to give access to the app-config.yaml file for reading credentials or plugin settings
import { Config } from '@backstage/config';
//CatalogClient is used to query the catalog for entities
import { CatalogClient } from '@backstage/catalog-client';

/**
 * Creates a fact retriever that dynamically queries all catalog entities and retrieves Dependabot alerts.
 * Defines and exports a function createDependabotFactRetriever that accepts config and logger, returning a FactRetriever object.
 */
export const createDependabotFactRetriever = (
  config: Config,
  logger: LoggerService,
): FactRetriever => {
  return {
    //Unique identifier for the fact retriever
    id: 'dependabotFactRetriever',
    //Version to manage changes over time and backard compatibility
    version: '0.2.1',
    //Only retrieves facts for entities of kind 'Component'
    entityFilter: [{ kind: 'Component' }],
    //Defines the output schema for the facts: a single integer field openAlertCount
    schema: {
      openAlertCount: {
        type: 'integer',
        description: 'Number of open Dependabot alerts for the component',
      },
    },
    //This function contains the logic to fetch and process the facts
    //It uses the GitHub API to fetch open Dependabot alerts for each component
    handler: async ({ discovery, auth }) => {
      //Fetches the GitHub token from the app config
      //This token is used to authenticate with the GitHub API
      const githubConfigs = config.getOptionalConfigArray('integrations.github');
      const githubToken = githubConfigs?.[0]?.getOptionalString('token');
      //If the token is not found, log an error and return an empty array
      //This prevents the function from running without proper authentication
      if (!githubToken) {
        logger.error('Missing GitHub token in config');
        return [];
      }
      //Fetches the catalog token using the auth plugin
      //This token is used to authenticate with the catalog API
      const { token: catalogToken } = await auth.getPluginRequestToken({
        onBehalfOf: await auth.getOwnServiceCredentials(),
        targetPluginId: 'catalog',
      });
      //If the token is not found, log an error and return an empty array
      //This prevents the function from running without proper authentication
      const catalogClient = new CatalogClient({ discoveryApi: discovery });
      const { items: entities } = await catalogClient.getEntities(
        { filter: [{ kind: 'Component' }] },
        { token: catalogToken },
      );
      //If no entities are found, log a warning and return an empty array
      //This prevents the function from running without proper data
      const Octokit = (await import('@octokit/rest')).Octokit;
      const octokit = new Octokit({ auth: githubToken });
      const results = await Promise.all(
        entities.map(async entity => {
          //Extracts the GitHub repository URL from the entity metadata
          //This URL is used to identify the repository for which to fetch alerts
          const repoUrl = entity.metadata.annotations?.['github.com/project-slug'];
          if (!repoUrl) return null;
          //Splits the URL to get the owner and repo name
          //This is used to construct the API request
          const [owner, name] = repoUrl.split('/');
          try {
            const alertsResponse = await octokit.request(
              'GET /repos/{owner}/{repo}/dependabot/alerts',
              { owner, repo: name, per_page: 100 },
            );
            //Filters the alerts to only include those that are open
            //This is used to count the number of open alerts for the repository
            const openAlerts = alertsResponse.data.filter(a => a.state === 'open');

            //Returns the entity information and the count of open alerts
            return {
              entity: {
                name: entity.metadata.name,
                kind: entity.kind,
                namespace: entity.metadata.namespace ?? 'default',
              },
              facts: {
                openAlertCount: openAlerts.length,
              },
            };
            //If the request fails, log a warning and return null
          } catch (e) {
            logger.warn(`Failed to fetch alerts for ${repoUrl}: ${e}`);
            return null;
          }
        }),
      );
      //Filters out any null results from the previous step
      //This ensures that only valid results are returned
      return results.filter(Boolean) as NonNullable<Awaited<ReturnType<FactRetriever['handler']>>>;
    },
  };
};