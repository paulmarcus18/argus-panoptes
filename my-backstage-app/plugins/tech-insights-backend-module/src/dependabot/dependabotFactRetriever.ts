/**
 * This file reads a github token from config, uses Octokit to fetch open dependabot alerts
 * Returns the number of alerts per repo in a structured way that Tech Insights can consume
 */
//Import fact retriever interface, used to define a retriever that collects factual data for a given entity
import { FactRetriever } from '@backstage-community/plugin-tech-insights-node';
//Imports the official GitHub REST API client library. Used to interact with GitHub's API to retrieve Dependabot alerts
import { Octokit } from '@octokit/rest';



/**
 * This FactRetriever queries the 'philips-labs/dct-notary-admin' repo
 * and returns the number of open Dependabot alerts.
 */
//Defines and exports the fact retriever object named dependabotFactRetriever
export const dependabotFactRetriever: FactRetriever = {
  //identifier for this fact retriever
  id: 'dependabotFactRetriever',
  //Versioning information for this retriever. Helps track changes over time
  version: '0.1.0',
  //Defines the structure of the facts returned, which is openAlertCount integer now
  schema: {
    openAlertCount: {
      type: 'integer',
      description: 'Number of open Dependabot alerts for dct-notary-admin repo',
    },
  },
  //main logic of the retriever, function that receives config and logger
  async handler({ config, logger }) {
    //declares a variable to store github token used for auth
    let token: string | undefined;
    //tries to read github integration config from app-config.yaml and extracts the token if available
    try {
      const githubConfigs = config.getOptionalConfigArray('integrations.github');
      const githubConfig = githubConfigs?.[0];
      token = githubConfig?.getOptionalString('token');

      //logs whether the token was found or not
      logger.info(`🔍 Retrieved GitHub token: ${token ? '✔️ Present' : '❌ Missing'}`);
      // Remove the next line in production
      //logger.info(`DEBUG: GitHub token = ${token}`);
    } catch (e) {
      //logs any error retrieving the token 
      logger.error(`❌ Could not retrieve GitHub token: ${e}`);
      return [];
    }

    if (!token) {
      //if token is missing then logs error and exits early
      logger.error('❌ GitHub token is not defined.');
      return [];
    }

    //initializes github api client with token to authorize future requests
    const octokit = new Octokit({ auth: token });

    //Declares an array of repos to check for alerts, easily extendable for multiple repos now
    //TO-DO: make the owner and name details be fetched automatically from frontend chosen repos
    const repos = [
      {
        owner: { login: 'MeherShroff2' },
        name: 'dct-notary-admin',
      },
    ];

    //parallel fetching for all repost listed above
    const results = await Promise.all(
      //loops over each repo and performs the retrieval asynchronously
      repos.map(async repo => {
        //calls github rest api to fetch dependabot alerts, for more than 100, pagination is needed
        //TO-DO : implement a way for more than 100 alerts to show
        try {
          const alertsResponse = await octokit.request(
            'GET /repos/{owner}/{repo}/dependabot/alerts',
            {
              owner: repo.owner.login,
              repo: repo.name,
              per_page: 100,
            },
          );

          //filters only alerts with state "open" to count open vulnerabilities
          const openAlerts = alertsResponse.data.filter(alert => alert.state === 'open');

          //returns a fact result object for the component including number of open alerts
          return {
            entity: {
              kind: 'Component',
              namespace: 'default',
              name: repo.name,
            },
            facts: {
              openAlertCount: openAlerts.length,
            },
          }; //handles errors and logs the corresponding error 
        } catch (err: any) {
          if (err.status === 403 || err.status === 404) {
            logger.warn(`⚠️ Access denied to alerts for ${repo.name} (status ${err.status}) — skipping`);
            return null;
          }
          //logs if there was an error with fetching alerts despite having access
          logger.error(`❌ Error fetching alerts for ${repo.name}: ${err.message} (status ${err.status})`);
          return null;
        }
      }),
    );

    //filters null results 
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
};
