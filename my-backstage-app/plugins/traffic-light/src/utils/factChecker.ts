import { TechInsightsApi } from '@backstage/plugin-tech-insights';
import { Entity } from '@backstage/catalog-model';
import { getCompoundEntityRef } from '@backstage/catalog-model';

export async function getDependabotStatusFromFacts(
  techInsightsApi: TechInsightsApi,
  entities: Entity[],
): Promise<{ color: 'green' | 'yellow' | 'red' | 'gray'; alertCount: number }> {
  if (!entities.length) {
    console.warn('⚠️ No entities provided to getDependabotStatusFromFacts');
    return { color: 'gray', alertCount: 0 };
  }

  const entity = entities[0];
  const entityRef = getCompoundEntityRef(entity);
  console.log(`📛 entityRef:`, entityRef);

  try {
    const facts = await techInsightsApi.getFacts(entityRef, ['dependabot:status']);
    let factObj = facts['dependabot:status'] ?? { color: 'yellow', alertCount: 0 };

    console.log(`🔍 Raw fact value:`, factObj);
    console.log(`🧪 Type of fact:`, typeof factObj);

    if (typeof factObj === 'string') {
      try {
        factObj = JSON.parse(factObj);
      } catch (e) {
        console.warn(`❗ Could not parse stringified fact`);
        return { color: 'gray', alertCount: 0 };
      }
    }

    if (
      typeof factObj !== 'object' ||
      factObj === null ||
      !('color' in factObj)
    ) {
      console.warn(`⚠️ Malformed dependabot fact:`, factObj);
      return { color: 'gray', alertCount: 0 };
    }

    const color = (factObj as { color?: unknown }).color;

    if (
      typeof color === 'string' &&
      ['green', 'yellow', 'red'].includes(color)
    ) {
      return {
        color: color as 'green' | 'yellow' | 'red',
        alertCount: (factObj as any).alertCount ?? 0,
      };
    }

    console.warn(`⚠️ Invalid color in fact:`, color);
    return { color: 'gray', alertCount: 0 };
  } catch (err) {
    console.error(`❌ Error retrieving facts for entity:`, err);
    return { color: 'gray', alertCount: 0 };
  }
}
