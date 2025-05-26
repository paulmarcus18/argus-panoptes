import { TechInsightsApi } from '@backstage/plugin-tech-insights';
import { Entity, getCompoundEntityRef } from '@backstage/catalog-model';
import { CatalogApi } from '@backstage/plugin-catalog-react';

export interface RepoAlertSummary {
  name: string;
  critical: number;
  high: number;
  medium: number;
}

async function getSeverityThresholdsFromSystem(
  systemName: string,
  catalogApi: CatalogApi,
): Promise<{ critical: number; high: number; medium: number }> {
  try {
    const { items: systems } = await catalogApi.getEntities({
      filter: { kind: 'System', 'metadata.name': systemName },
    });

    const system = systems[0];
    const annotation = system?.metadata?.annotations?.['dependabot/thresholds'];

    console.log('📥 Fetched systems:', systems.map(s => s.metadata.name));
    console.log('📒 Threshold annotation:', annotation);

    if (annotation) {
      try {
        const parsed = JSON.parse(annotation);
        return {
          critical: parsed.critical ?? 1,
          high: parsed.high ?? 3,
          medium: parsed.medium ?? 10,
        };
      } catch (err) {
        console.warn(`❌ Failed to parse JSON thresholds for system "${systemName}"`, err);
      }
    }
  } catch (e) {
    console.warn(`⚠️ Failed to fetch system "${systemName}" from catalog`, e);
  }

  return { critical: 1, high: 3, medium: 10 };
}

export async function getDependabotStatusFromFacts(
  techInsightsApi: TechInsightsApi,
  entities: Entity[],
  systemName: string,
  catalogApi: CatalogApi,
): Promise<{
  color: 'green' | 'yellow' | 'red' | 'gray';
  reason: string;
  alertCounts: number[];
}> {
  if (!entities.length) {
    return { color: 'gray', reason: 'No entities provided', alertCounts: [] };
  }

  let totalCritical = 0;
  let totalHigh = 0;
  let totalMedium = 0;
  let validCount = 0;

  for (const entity of entities) {
    const entityRef = getCompoundEntityRef(entity);
    try {
      const facts = await techInsightsApi.getFacts(entityRef, ['dependabotFactRetriever']);
      const fact = facts['dependabotFactRetriever']?.facts;

      if (fact) {
        if (typeof fact.critical === 'number') totalCritical += fact.critical;
        if (typeof fact.high === 'number') totalHigh += fact.high;
        if (typeof fact.medium === 'number') totalMedium += fact.medium;
        validCount++;
      }
    } catch (err) {
      console.warn(`⚠️ Failed to fetch facts for ${entityRef.name}`, err);
    }
  }

  if (validCount === 0) {
    return { color: 'gray', reason: 'No valid facts available', alertCounts: [] };
  }

  const thresholds =
    catalogApi && systemName
      ? await getSeverityThresholdsFromSystem(systemName, catalogApi)
      : { critical: 1, high: 3, medium: 10 };

  console.log(`📊 Thresholds:`, thresholds);
  console.log(`📦 Totals: critical=${totalCritical}, high=${totalHigh}, medium=${totalMedium}`);

  let color: 'green' | 'yellow' | 'red' = 'green';
  let reason = '';
  let alertCounts = [];

  if (totalCritical > thresholds.critical) {
    color = 'red';
    reason = `Critical alerts exceed threshold (${totalCritical} > ${thresholds.critical})`;
    alertCounts = [totalCritical, totalHigh, totalMedium];
  } else if (totalHigh > thresholds.high) {
    color = 'yellow';
    reason = `High alerts exceed threshold (${totalHigh} > ${thresholds.high})`;
    alertCounts = [totalCritical, totalHigh, totalMedium];
  } else if (totalMedium > thresholds.medium) {
    color = 'yellow';
    reason = `Medium alerts exceed threshold (${totalMedium} > ${thresholds.medium})`;
    alertCounts = [totalCritical, totalHigh, totalMedium];
  } else {
    reason = `All severities within thresholds(${totalCritical} < ${thresholds.critical})`;
    alertCounts = [totalCritical, totalHigh, totalMedium];
  }

  return { color, reason, alertCounts };
}

export async function getTop5CriticalDependabotRepos(
  techInsightsApi: TechInsightsApi,
  entities: Entity[],
): Promise<RepoAlertSummary[]> {
  const results: RepoAlertSummary[] = [];

  for (const entity of entities) {
    const entityRef = getCompoundEntityRef(entity);
    try {
      const facts = await techInsightsApi.getFacts(entityRef, ['dependabotFactRetriever']);
      const fact = facts['dependabotFactRetriever']?.facts;

      results.push({
        name: entity.metadata.name,
        critical: typeof fact?.critical === 'number' ? fact.critical : 0,
        high: typeof fact?.high === 'number' ? fact.high : 0,
        medium: typeof fact?.medium === 'number' ? fact.medium : 0,
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
