import {
  CompoundEntityRef,
  stringifyEntityRef,
  Entity,
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
  critical: number;
  high: number;
  medium: number;
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

  async getTop5CriticalDependabotRepos(
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
          critical: typeof facts.critical === 'number' ? facts.critical : 0,
          high: typeof facts.high === 'number' ? facts.high : 0,
          medium: typeof facts.medium === 'number' ? facts.medium : 0,
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
   */
  async getDependabotFacts(
    api: TechInsightsApi,
    entity: CompoundEntityRef,
  ): Promise<DependabotFacts> {
    try {
      console.log('📡 Fetching Dependabot facts for entity:', stringifyEntityRef(entity));

      const response = await api.getFacts(entity, ['dependabotFactRetriever']);

      console.log('📦 Raw Tech Insights API response:', JSON.stringify(response, null, 2));

      const facts = response?.['dependabotFactRetriever']?.facts;

      if (!facts) {
        console.error('❌ No facts found for entity:', stringifyEntityRef(entity));
        return { critical: 0, high: 0, medium: 0 };
      }

      console.log(
        '✅ Parsed Dependabot facts:',
        'critical:', facts.critical,
        'high:', facts.high,
        'medium:', facts.medium,
      );

      return {
        critical: Number(facts.critical ?? 0),
        high: Number(facts.high ?? 0),
        medium: Number(facts.medium ?? 0),
      };
    } catch (error) {
      console.error('❌ Error fetching Dependabot facts for entity:', stringifyEntityRef(entity), error);
      return { critical: 0, high: 0, medium: 0 };
    }
  }

  /**
   * Runs checks on Dependabot facts for a given entity using the Tech Insights API.
   * Returns the results from the checks.
   */
  async getDependabotChecks(
    api: TechInsightsApi,
    entity: CompoundEntityRef,
  ): Promise<DependabotChecks> {
    try {
      console.log('[🔎] Running Dependabot checks for entity:', stringifyEntityRef(entity));

      const checkResults = await api.runChecks(entity);

      console.log('[🐛 Raw Check Results]', checkResults);

      const criticalCheck = checkResults.find(r => r.check.id === 'dependabot-critical-alerts');
      const highCheck = checkResults.find(r => r.check.id === 'dependabot-high-alerts');
      const mediumCheck = checkResults.find(r => r.check.id === 'dependabot-medium-alerts');

      if (checkResults.length === 0) {
        console.error('[❌ No Dependabot checks found for entity]', stringifyEntityRef(entity));
        return {
          criticalAlertCheck: false,
          highAlertCheck: false,
          mediumAlertCheck: false,
        };
      }

      return {
        criticalAlertCheck: criticalCheck?.result === true,
        highAlertCheck: highCheck?.result === true,
        mediumAlertCheck: mediumCheck?.result === true,
      };
    } catch (error) {
      console.error('[❌ Error] getDependabotChecks failed:', error);
      return {
        criticalAlertCheck: false,
        highAlertCheck: false,
        mediumAlertCheck: false,
      };
    }
  }
}
