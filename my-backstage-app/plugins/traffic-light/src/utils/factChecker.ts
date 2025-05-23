import { TechInsightsApi } from '@backstage/plugin-tech-insights';
import { Entity, getCompoundEntityRef } from '@backstage/catalog-model';
import { CatalogApi } from '@backstage/plugin-catalog-react';

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

    console.log('📥 Raw system entities fetched:', systems.map(s => s.metadata.name));
    console.log('📒 Raw annotation string:', annotation);

    if (annotation) {
      try {
        const parsed = JSON.parse(annotation);
        return {
          critical: parsed.critical ?? 1,
          high: parsed.high ?? 3,
          medium: parsed.medium ?? 10,
        };
      } catch (err) {
        console.warn(`❌ Failed to parse annotation JSON for system "${systemName}"`, err);
      }
    }
  } catch (e) {
    console.warn(`⚠️ Could not fetch system "${systemName}" from catalog`, e);
  }

  // Default fallback
  return { critical: 1, high: 3, medium: 10 };
}

export async function getDependabotStatusFromFacts(
  techInsightsApi: TechInsightsApi,
  entities: Entity[],
  systemName: string,
  catalogApi: CatalogApi,
): Promise<{ color: 'green' | 'yellow' | 'red' | 'gray'; reason: string; alertCounts: number[] }> {
  if (!entities.length) {
    console.warn('⚠️ No entities provided to getDependabotStatusFromFacts');
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
      const factObj = facts['dependabotFactRetriever']?.facts;

      if (factObj) {
        if (typeof factObj.critical === 'number') totalCritical += factObj.critical;
        if (typeof factObj.high === 'number') totalHigh += factObj.high;
        if (typeof factObj.medium === 'number') totalMedium += factObj.medium;
        validCount++;
      } else {
        console.warn(`⚠️ No valid dependabot fact for ${entityRef.name}`);
      }
    } catch (err) {
      console.error(`❌ Failed to fetch facts for ${entityRef.name}`, err);
    }
  }

  if (validCount === 0) {
    return { color: 'gray', reason: 'No valid facts available', alertCounts:[] };
  }

  const thresholds = catalogApi && systemName
    ? await getSeverityThresholdsFromSystem(systemName, catalogApi)
    : { critical: 1, high: 3, medium: 10 };

  console.log(`📊 Thresholds - critical: ${thresholds.critical}, high: ${thresholds.high}, medium: ${thresholds.medium}`);
  console.log(`📦 Totals - critical: ${totalCritical}, high: ${totalHigh}, medium: ${totalMedium}`);

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
