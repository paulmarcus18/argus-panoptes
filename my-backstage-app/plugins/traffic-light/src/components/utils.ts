import {
  CompoundEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';

import { JsonObject } from '@backstage/types';

export async function getAzureDevOpsBugs() {
  const organization = 'argus-panoptes-dev';
  const project = 'repo_2';
  const queryId = 'b2fdb928-a73e-4cba-82c9-e605a194666d';
  const pat =
    '9APDLq54nbzmerzTCuD50qLNWFHSprSivK7Q6zTuvqqP3PNMFPW0JQQJ99BDACAAAAAAAAAAAAASAZDOrt3M';

  const encodedPat = btoa(':' + pat);

  const response = await fetch(
    `https://dev.azure.com/${organization}/${project}/_apis/wit/wiql/${queryId}?api-version=7.0`,
    {
      method: 'GET',
      headers: {
        Authorization: `Basic ${encodedPat}`,
        Accept: 'application/json',
      },
    },
  );

  const data = await response.json();
  const bugs = data.workItems;
  const bugCount = bugs.length;

  console.log('Azure DevOps bugs:', bugs);

  return bugCount;
}

export type TrafficLightColor = 'green' | 'yellow' | 'red';

interface WorkflowRun {
  id: number;
  name: string;
  status: 'completed' | 'queued' | 'in_progress' | string;
  conclusion:
    | 'success'
    | 'failure'
    | 'timed_out'
    | 'cancelled'
    | 'neutral'
    | null
    | string;
  [key: string]: any;
}

interface WorkflowConfig {
  exclude: string[];
  critical: string[];
  sampleIfNoCritical: number;
}

function shuffleArray(array: string[]): string[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function loadWorkflowConfig(): Promise<WorkflowConfig> {
  try {
    const res = await fetch('/config/github-workflows.json');
    if (!res.ok) throw new Error('Failed to load config');
    const data = await res.json();
    return (
      data.workflowConfig || {
        exclude: [],
        critical: [],
        sampleIfNoCritical: 0,
      }
    );
  } catch (err) {
    console.error('Config load error:', err);
    return { exclude: [], critical: [], sampleIfNoCritical: 0 };
  }
}

export async function getGitHubRepoStatus(
  repoName: string,
): Promise<{ color: TrafficLightColor; reason: string }> {
  const apiUrl = `https://api.github.com/repos/philips-labs/${repoName}/actions/runs?branch=main`;

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    console.error('Failed to fetch GitHub data:', response.statusText);
    return { color: 'red', reason: `GitHub API error: ${response.statusText} `};
  }

  const data = await response.json();
  const allRuns = data.workflow_runs as WorkflowRun[];

  if (allRuns.length === 0) {
    return { color: 'red', reason: "No workflow runs found on 'main' branch." };
  }

  const { exclude, critical, sampleIfNoCritical } = await loadWorkflowConfig();

  const allWorkflowNames = [...new Set(allRuns.map(run => run.name))].filter(
    name => !exclude.includes(name),
  );
  const criticalWorkflows =
    critical.length > 0
      ? critical
      : shuffleArray(allWorkflowNames).slice(0, sampleIfNoCritical);

  const latestPerWorkflow = new Map<string, WorkflowRun>();
  for (const run of allRuns) {
    if (!exclude.includes(run.name) && !latestPerWorkflow.has(run.name)) {
      latestPerWorkflow.set(run.name, run);
    }
  }

  const failing: string[] = [];
  const inProgress: string[] = [];

  for (const [name, run] of latestPerWorkflow.entries()) {
    if (criticalWorkflows.includes(name)) {
      if (run.status !== 'completed') {
        inProgress.push(name);
      } else if (
        ['failure', 'timed_out', 'cancelled'].includes(run.conclusion || '')
      ) {
        failing.push(name);
      }
    }
  }

  if (failing.length > 0) {
    return {
      color: 'red',
      reason: `Critical workflows failed: ${failing.join(', ')}`,
    };
  } else if (inProgress.length > 0) {
    return {
      color: 'yellow',
      reason: `Critical workflows in progress: ${inProgress.join(', ')}`,
    };
  } else {
    return { color: 'green', reason: 'All critical workflows succeeded.' };
  }
}

/**
 * Fetches SonarQube facts for a given entity using the Tech Insights API.
 * Returns the following metrics: bugs, code smells, vulnerabilities, code coverage, and quality gate status.
 *
 * @param api - The TechInsightsApi instance used to fetch facts.
 * @param entity - The entity reference for which to fetch SonarQube facts.
 * @returns An object containing SonarQube metrics for the entity.
 */
export const getSonarQubeFacts = async (
  api: TechInsightsApi,
  entity: CompoundEntityRef,
): Promise<{
  bugs: number;
  code_smells: number;
  vulnerabilities: number;
  code_coverage: number;	
  quality_gate: string;
}> => {
  try {
    // Log which entity is being queried
    console.log('Fetching SonarCloud facts for entity:', stringifyEntityRef(entity));

    // Fetch facts from the Tech Insights API for the given entity and retriever
    const response = await api.getFacts(entity, ['sonarcloud-fact-retriever']);

    // ------------------------------------------------
    // Facts checks
    const checkResults = await api.runChecks(entity, ['noHighBugsCheck', 'vulnerabilitiesCheck',]);
    const bugsCheck = checkResults.find(r => r.check.id === 'noHighBugsCheck');
    const vulnerabilitiesCheck = checkResults.find(r => r.check.id === 'vulnerabilitiesCheck');
    const codeSmellsCheck = checkResults.find(r => r.check.id === 'noHighCodeSmellsCheck');
    const qualityGateCheck = checkResults.find(r => r.check.id === 'qualityGateCheck');
    const codeCoverageCheck = checkResults.find(r => r.check.id === 'codeCoverageCheck');
    
    // Log the results of the checks for debugging
    console.log("Result from Bugs checks:", bugsCheck?.result);
    console.log("Result from Vulnerabilities checks:", vulnerabilitiesCheck?.result);
    console.log("Result from Code Smells checks:", codeSmellsCheck?.result);
    console.log("Result from Quality Gate checks:", qualityGateCheck?.result);
    console.log("Result from Code Coverage checks:", codeCoverageCheck?.result);

    // End of facts checks
    // -----------------------------------------------

    // Log the raw response from the API for debugging
    console.log(
      'Raw Tech Insights API response:',
      JSON.stringify(response, null, 2),
    );

    // Extract the facts object from the response
    const facts = response?.['sonarcloud-fact-retriever']?.facts;

    // If no facts are found, log an error and return default values
    if (!facts) {
      console.error(
        'No facts found for entity:',
        stringifyEntityRef(entity),
      );
      return { bugs: 0, code_smells: 0, vulnerabilities: 0, code_coverage: 0, quality_gate: 'NONE' };
    }

    // Log the parsed facts for debugging
    console.log(
      'Parsed SonarCloud facts:', facts.bugs, facts.code_smells, facts.vulnerabilities, facts.code_coverage, facts.quality_gate
    );

    // Return the parsed facts, converting to appropriate types and providing defaults
    return {
      bugs: Number(facts.bugs ?? 0),
      code_smells: Number(facts.code_smells ?? 0),
      vulnerabilities: Number(facts.vulnerabilities ?? 0),
      code_coverage: Number(facts.code_coverage ?? 0),
      quality_gate: String(facts.quality_gate || 'NONE'),
    };
  } catch (error) {
    // Log any errors encountered during the fetch process
    console.error(
      'Error fetching SonarCloud facts for entity:',
      stringifyEntityRef(entity),
      error,
    );
    // Return default values if an error occurs
    return { bugs: 0, code_smells: 0, vulnerabilities: 0, code_coverage: 0, quality_gate: 'NONE' };
  }
};

/**
 * Interface defining the shape of GitHub security facts
 */
export interface GitHubSecurityFacts {
  openCodeScanningAlertCount: number;
  openSecretScanningAlertCount: number;
  codeScanningAlerts: Record<string, {
    severity: string;
    description: string;
    html_url: string;
    direct_link?: string;
    location?: {
      path: string;
      start_line: number;
      commit_sha: string;
    };
    created_at: string;
    rule?: {
      id: string;
      name: string;
      description?: string;
    };
  }>;
  secretScanningAlerts: Record<string, {
    severity: string;
    description: string;
    html_url: string;
    created_at: string;
  }>;
}

/**
 * Function to fetch GitHub security facts for a given entity
 */
export const getGitHubSecurityFacts = async (
  api: TechInsightsApi,
  entity: CompoundEntityRef,
): Promise<GitHubSecurityFacts> => {
  try {
    console.log(
      'Fetching GitHub Security facts for entity:',
      stringifyEntityRef(entity),
    );
    
    const response = await api.getFacts(entity, ['githubAdvancedSecurityFactRetriever']);
    
    console.log(
      'Raw Tech Insights API response:',
      JSON.stringify(response, null, 2),
    );
    
    const facts = response?.['githubAdvancedSecurityFactRetriever']?.facts;
    
    if (!facts) {
      console.error(
        'No GitHub Security facts found for entity:',
        stringifyEntityRef(entity),
      );
      return {
        openCodeScanningAlertCount: 0,
        openSecretScanningAlertCount: 0,
        codeScanningAlerts: {},
        secretScanningAlerts: {},
      };
    }
    
    // Type assertion to handle the JSON types correctly
    const codeScanningAlerts = (facts.codeScanningAlerts as JsonObject) || {};
    const secretScanningAlerts = (facts.secretScanningAlerts as JsonObject) || {};
    
    return {
      openCodeScanningAlertCount: Number(facts.openCodeScanningAlertCount ?? 0),
      openSecretScanningAlertCount: Number(facts.openSecretScanningAlertCount ?? 0),
      // Cast to the expected types 
      codeScanningAlerts: codeScanningAlerts as GitHubSecurityFacts['codeScanningAlerts'],
      secretScanningAlerts: secretScanningAlerts as GitHubSecurityFacts['secretScanningAlerts'],
    };
  } catch (error) {
    console.error(
      'Error fetching GitHub Security facts for entity:',
      stringifyEntityRef(entity),
      error,
    );
    return {
      openCodeScanningAlertCount: 0,
      openSecretScanningAlertCount: 0,
      codeScanningAlerts: {},
      secretScanningAlerts: {},
    };
  }
};
