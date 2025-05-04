import { TechInsightsApi, techInsightsApiRef } from '@backstage-community/plugin-tech-insights';
import { useApi } from '@backstage/core-plugin-api';
import { CompoundEntityRef } from '@backstage/catalog-model';
import { getAzureDevOpsBugs, getGitHubRepoStatus, getSonarQubeFacts } from '../utils.ts';

export type TrafficLightColor = 'green' | 'yellow' | 'red';

export type StatusResponse = {
  [checkName: string]: { color: TrafficLightColor; reason: string };
};

const generateMetricScore = (): number => Math.floor(Math.random() * 100);

const evaluateColor = (
  score: number,
): { color: TrafficLightColor; reason: string } => {
  if (score >= 70) {
    // Example threshold now set for 70 will change later for specific tool
    return { color: 'green', reason: `Score ${score} ≥ 70 (green)` };
  }
  return { color: 'red', reason: `Score ${score} < 70 (red)` };
};

const evaluateColorDevOps = (
  score: number,
): { color: TrafficLightColor; reason: string } => {
  if (score == 0) {
    // Example threshold now set for 70 will change later for specific tool
    return { color: 'green', reason: `0 bugs` };
  } else if (score == 1) {
    return { color: 'yellow', reason: `1 bug` };
  } else {
    return { color: 'red', reason: `> 1 bugs` };
  }
};

// Ensure status returned by getGitHubRepoStatus is valid
const validateTrafficLightColor = (status: any): TrafficLightColor => {
  if (status === 'green' || status === 'yellow' || status === 'red') {
    return status;
  }
  return 'red'; // Default to 'red' if status is invalid
};

const evaluateSonarCloudStatus = (
  facts: { bugs: number; code_smells: number; security_hotspots: number }
): { color: TrafficLightColor; reason: string } => {
  // Rules based on your fact checker configuration
  if (facts.bugs > 0) {
    return { color: 'red', reason: `${facts.bugs} bugs detected` };
  }
  
  if (facts.code_smells > 15) {
    return { color: 'red', reason: `${facts.code_smells} code smells (>20)` };
  } else if (facts.code_smells > 10) {
    return { color: 'yellow', reason: `${facts.code_smells} code smells (10-20)` };
  }
  
  if (facts.security_hotspots > 3) {
    return { color: 'red', reason: `${facts.security_hotspots} security hotspots (>3)` };
  } else if (facts.security_hotspots > 0) {
    return { color: 'yellow', reason: `${facts.security_hotspots} security hotspots (1-3)` };
  }
  
  // All good - passes all checks
  return { color: 'green', reason: 'No bugs, acceptable code smells and security hotspots' };
};

export const fetchRepoStatus = async (
  repoName: string,
): Promise<StatusResponse> => {
  await new Promise(resolve => setTimeout(resolve, 300));

  const status = await getGitHubRepoStatus(repoName);

  console.log('Received GitHub status!!!!!!!!!!!!!!!!:', status);

  // Validate the status before using it
  const preProdStatus: TrafficLightColor = validateTrafficLightColor(status);

  // Create entity reference for SonarCloud facts
  const entity: CompoundEntityRef = {
    kind: 'component',
    namespace: 'default',
    name: repoName || 'tabia', // Use tabia as fallback based on your fact retriever
  };
  
  // Get SonarCloud facts and evaluate status
  let sonarStatus = { color: 'green' as TrafficLightColor, reason: 'Score 70 ≥ 70 (green)' };
  try {
    console.log('Fetching SonarCloud facts for api:', entity);
    const api = useApi(techInsightsApiRef);
    console.log('Fetching SonarCloud facts for entity:', entity);
    const sonarFacts = await getSonarQubeFacts(api, entity);
    sonarStatus = evaluateSonarCloudStatus(sonarFacts);
  } catch (error) {
    console.error('Failed to get SonarCloud facts:', error);
    sonarStatus = { color: 'red', reason: 'Failed to retrieve SonarCloud data' };
  }

  return {
    Dependabot: { color: 'green', reason: `Score 70 ≥ 70 (green)` },
    BlackDuck: { color: 'green', reason: `Score 70 ≥ 70 (green)` },
    Fortify: { color: 'green', reason: 'Fixed yellow for Fortify' },
    SonarQube: sonarStatus,
    CodeScene: { color: 'green', reason: `Score 70 ≥ 70 (green)` },
    'Reporting Pipeline': { color: 'green', reason: `Score 70 ≥ 70 (green)` },
    'Pre-Production pipelines': {
      color: preProdStatus,
      reason: `Score 70 ≥ 70 (green)`,
    },
    'Foundation Pipelines': evaluateColorDevOps(await getAzureDevOpsBugs()),
  };
};