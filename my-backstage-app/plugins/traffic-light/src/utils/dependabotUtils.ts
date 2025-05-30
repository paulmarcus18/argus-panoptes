import {
  CompoundEntityRef,
  stringifyEntityRef, Entity,
  getCompoundEntityRef,
} from '@backstage/catalog-model';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';

export interface RepoAlertSummary {
  name: string;
  critical: number;
  high: number;
  medium: number;
}

export interface DependabotFacts {
  criticalAlertsCount: number; 
  highAlertsCount: number;
  mediumAlertsCount: number;
}

export interface DependabotChecks {
  criticalAlertCheck: boolean;    
  highAlertCheck: boolean;
  mediumAlertCheck: boolean;
}

/**
 * Class‑based wrapper around {@link TechInsightsApi} that exposes typed helper
 * methods for Dependabot facts & checks.
 */
export class DependabotUtils {
  constructor() {}

async  getTop5CriticalDependabotRepos(
  techInsightsApi: TechInsightsApi,
  entities: Entity[],
): Promise<RepoAlertSummary[]> {
  const results: RepoAlertSummary[] = [];

  for (const entity of entities) {
    const entityRef = getCompoundEntityRef(entity);
    try {
      const facts = await this.getDependabotFacts(techInsightsApi, entityRef);
      results.push({
        name: entity.metadata.name,
        critical: typeof facts.criticalAlertsCount === 'number' ? facts.criticalAlertsCount : 0,
        high: typeof facts.highAlertsCount === 'number' ? facts.highAlertsCount : 0,
        medium: typeof facts.mediumAlertsCount === 'number' ? facts.mediumAlertsCount : 0,
      });
    } catch (err) {
      console.warn(`⚠️ Could not fetch dependabot fact for ${entityRef.name}`, err);
      results.push({
        name: entity.metadata.name,
        critical: 0,
        high: 0,
        medium: 0,
      });
    }
  }

  const selected: RepoAlertSummary[] = [];

  const criticalRepos = results
    .filter(r => r.critical > 0)
    .sort((a, b) => b.critical - a.critical);
  selected.push(...criticalRepos.slice(0, 5));

  if (selected.length < 5) {
    const highRepos = results
      .filter(r => !selected.includes(r) && r.high > 0)
      .sort((a, b) => b.high - a.high);
    selected.push(...highRepos.slice(0, 5 - selected.length));
  }

  if (selected.length < 5) {
    const mediumRepos = results
      .filter(r => !selected.includes(r) && r.medium > 0)
      .sort((a, b) => b.medium - a.medium);
    selected.push(...mediumRepos.slice(0, 5 - selected.length));
  }

  if (selected.length < 5) {
    const fallback = results
      .filter(r => !selected.includes(r))
      .slice(0, 5 - selected.length);
    selected.push(...fallback);
  }

  return selected;
}

/**
 * Fetches Dependabot facts for a given entity using the Tech Insights API.
 * Returns metrics like total alert counts per severity.
 *
 * @param api - The TechInsightsApi instance used to fetch facts.
 * @param entity - The entity reference for which to fetch Dependabot facts.
 */
async getDependabotFacts (
  api: TechInsightsApi,
  entity: CompoundEntityRef,
): Promise<DependabotFacts>  {
  try {
    console.log(
      'Fetching Dependabot facts for entity:',
      stringifyEntityRef(entity),
    );

    const response = await api.getFacts(entity, ['dependabotFactRetriever']);

    console.log(
      'Raw Tech Insights API response:',
      JSON.stringify(response, null, 2),
    );

    const facts = response?.['dependabotFactRetriever']?.facts;


    if (!facts) {
      console.error('No facts found for entity:', stringifyEntityRef(entity));
      return {
        criticalAlertsCount: 0,
        highAlertsCount: 0,
        mediumAlertsCount: 0,
      };
    }

    console.log(
      'Parsed Dependabot facts:',
        facts.criticalAlertsCount,  
        facts.highAlertsCount,
        facts.mediumAlertsCount,
    );

    return {
        criticalAlertsCount: Number(facts.criticalAlertsCount ?? 0),
        highAlertsCount: Number(facts.highAlertsCount ?? 0),    
        mediumAlertsCount: Number(facts.mediumAlertsCount ?? 0),
    };
  } catch (error) {
    console.error(
      'Error fetching Dependabot facts for entity:',
      stringifyEntityRef(entity),
      error,
    );
    return {
        criticalAlertsCount: 0,
        highAlertsCount: 0,
        mediumAlertsCount: 0,   
    };
  }
};

/**
 * Runs checks on Dependabot facts for a given entity using the Tech Insights API.
 * Returns the results from the checks.
 *
 * @param api - The TechInsightsApi instance used to fetch facts.
 * @param entity - The entity reference for which to fetch Dependabot facts.
 */
async getDependabotChecks (
  api: TechInsightsApi,
  entity: CompoundEntityRef,
): Promise<DependabotChecks>  {
  try {
    console.log('[🔎] Running Dependabot checks for entity:', stringifyEntityRef(entity));

    const checkResults = await api.runChecks(entity);

    console.log('[🐛 Raw Check Results]', checkResults);

    // // Filter only Dependabot-related checks
    // const dependabotChecks = checkResults.filter(r =>
    //   r.check.id.startsWith('dependabot-'),
    // );

    // // Log individual check results
    // dependabotChecks.forEach(result => {
    //   console.log(
    //     `[🔍 ${result.check.id}]`,
    //     '→ result:', result.result,
    //     '→ fact value:', result.facts?.[result.check.factIds?.[0]]?.value,
    //   );
    // });
    
    const criticalCheck = checkResults.find(r => r.check.id === 'dependabot-critical-alerts');
    const highCheck = checkResults.find(r => r.check.id === 'dependabot-high-alerts');
    const mediumCheck = checkResults.find(r => r.check.id === 'dependabot-medium-alerts');
    // const allPass = dependabotChecks.every(r => r.result === true);

    if(checkResults.length === 0) {
      console.error('[❌ No Dependabot checks found for entity]', stringifyEntityRef(entity));
       return {criticalAlertCheck: false, highAlertCheck: false, mediumAlertCheck: false};
    }
   
    return{
      criticalAlertCheck: criticalCheck?.result === true,
      highAlertCheck: highCheck?.result === true,
      mediumAlertCheck: mediumCheck?.result === true,}
    // console.log('[✅ All Dependabot checks pass?]', allPass);

    // return { allDependabotChecksPass: allPass };
  } catch (error) {
    console.error('[❌ Error] getDependabotChecks failed:', error);
    return { criticalAlertCheck: false, highAlertCheck: false, mediumAlertCheck: false };
  }
};

}