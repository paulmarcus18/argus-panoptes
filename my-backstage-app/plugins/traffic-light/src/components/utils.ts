import { CompoundEntityRef, stringifyEntityRef } from '@backstage/catalog-model';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';

export async function getAzureDevOpsBugs() {
  const organization = "argus-panoptes-dev";
  const project = "repo_2";
  const queryId = "b2fdb928-a73e-4cba-82c9-e605a194666d";
  const pat = "9APDLq54nbzmerzTCuD50qLNWFHSprSivK7Q6zTuvqqP3PNMFPW0JQQJ99BDACAAAAAAAAAAAAASAZDOrt3M";

  const encodedPat = btoa(":" + pat);

  const response = await fetch(`https://dev.azure.com/${organization}/${project}/_apis/wit/wiql/${queryId}?api-version=7.0`, {
    method: "GET",
    headers: {
      "Authorization": `Basic ${encodedPat}`,
      "Accept": "application/json"
    }
  });

  const data = await response.json();

  // Save bug count in a variable
  const bugs = data.workItems;
  const bugCount = bugs.length;

  console.log("Azure DevOps bugs:", bugs);

  return bugCount;
}

export async function getGitHubRepoStatus(repoName: string) {
  const token = "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"; 
  //const token = ${GITHUB_TOKEN};

  // GitHub API URL for the repository status
  const apiUrl = `https://api.github.com/repos/philips-labs/${repoName}/actions/runs?main`;

  // GET request to GitHub API
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      "Authorization": `token ${token}`,
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    console.error("Failed to fetch data from GitHub:", response.statusText);
    return;
  }
  const data = await response.json();

  // for the latest run
  const latestRun = data.workflow_runs?.[0];

  if (!latestRun) {
      console.warn("No workflow runs found on the 'main' branch");
      return "no_runs";
  }

  if (latestRun.status === "completed") {
      switch (latestRun.conclusion) {
        case "success":
          return "green";
        case "failure":
        case "timed_out":
        case "cancelled":
        case "neutral":
          return "red"; // Return red for failure or any other negative conclusion
        default:
          return "yellow"; // If we encounter an unknown conclusion state
      }
    } else {
      console.log(" Workflow is still in progress or queued.");
      return "yellow"; // Default to yellow if the workflow is not completed yet
    }
  }

  export const getSonarQubeFacts = async (
    api: TechInsightsApi,
    entity: CompoundEntityRef,
  ): Promise<{ bugs: number; code_smells: number; security_hotspots: number }> => {
    // Get facts using the entity reference and the fact retriever ID
    // const factsNames= ['bugs','code_smells','security_hotspots'];

    // const response = await api.getFacts(
    //   entity,
    //   factsNames
    // );

    // let facts: Record<string, any> = {};


    // if (Array.isArray(response)) {
    //   const factEntry = response.find(
    //     item =>
    //       item.factRetrieverId === 'sonarcloud-fact-retriever' ||
    //       item.id === 'sonarcloud-fact-retriever',
    //   );
    //   facts = factEntry?.facts || {};
    // } else if (typeof response === 'object' && response !== null) {
    //   facts = response['sonarcloud-fact-retriever'] || response;
    // }

    // return {
    //   bugs: Number(response[0]?.facts?.bugs),
    //   code_smells: Number(response[0]?.facts?.code_smells),
    //   security_hotspots: Number(response[0]?.facts?.security_hotspots),
    // };
    try {
      // Define the fact names we want to retrieve
      const factNames = ['bugs', 'code_smells', 'security_hotspots'];
      
      // Call the Tech Insights API to get facts for our entity
      const response = await api.getFacts(
        entity,
        ['sonarcloud-fact-retriever']
      );
      
      // Useful for debugging: log the raw response from the API
      console.log('Raw Tech Insights API response:', JSON.stringify(response, null, 2));
      
      return {
        bugs: Number(response['sonarcloud-fact-retriever']?.facts?.bugs),
        code_smells: Number(response['sonarcloud-fact-retriever']?.facts?.code_smells),
        security_hotspots: Number(response['sonarcloud-fact-retriever']?.facts?.security_hotspots),
      };
      
      // If we couldn't find the facts, return zeros
      console.error('Could not find SonarCloud facts in the response');
      return { bugs: 0, code_smells: 0, security_hotspots: 0 };
    } catch (error) {
      console.error('Error fetching SonarCloud facts:', error);
      return { bugs: 0, code_smells: 0, security_hotspots: 0 };
    }
  };

    