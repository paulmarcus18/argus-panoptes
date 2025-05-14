import { TechInsightsApi } from '@backstage/plugin-tech-insights';
import { Entity } from '@backstage/catalog-model';
import { getCompoundEntityRef } from '@backstage/catalog-model';

export async function getDependabotStatusFromFacts(
  techInsightsApi: TechInsightsApi,
  entities: Entity[],
): Promise<{ color: 'green' | 'yellow' | 'red' | 'gray'}> {
  if (!entities.length) {
    console.warn('⚠️ No entities provided to getDependabotStatusFromFacts');
    return { color: 'gray'};
  }

  const entity = entities[0];
  const entityRef = getCompoundEntityRef(entity);
  console.log(`📛 entityRef:`, entityRef);

  try {
    const facts = await techInsightsApi.getFacts(entityRef,['dependabotFactRetriever']);
    let factObj = facts['dependabotFactRetriever'];

  if (!factObj) {
    console.warn(`⚠️ dependabot:status not found in facts`, facts);
    return { color: 'yellow'};
  }
    console.log(`🔍 Raw fact value:`, factObj);
    console.log(`🧪 Type of fact:`, typeof factObj);

    // if (typeof factObj === 'string') {
    //   try {
    //     factObj = JSON.parse(factObj);
    //   } catch (e) {
    //     console.warn(`❗ Could not parse stringified fact`);
    //     return { color: 'gray'};
    //   }
    // }

    if (
      typeof factObj !== 'object' ||
      factObj === null ||
      typeof factObj.facts !== 'object' ||
      factObj.facts === null ||
      !('alertCount' in factObj.facts)
    ) {
      console.warn(`⚠️ Malformed dependabot fact:`, factObj);
      return { color: 'gray'};
    }

    //const color = (factObj as { color?: unknown }).color;
    const alertCount = factObj.facts.alertCount;

    if (alertCount === undefined) {
      console.warn(`⚠️ 'alertCount' not found for the fact`, factObj);
      return { color: 'gray' };
    }

    // if (
    //   typeof color === 'string' &&
    //   ['green', 'yellow', 'red'].includes(color)
    // ) {
    //   return {
    //     color: color as 'green' | 'yellow' | 'red',

    //   };
    // }

    let color: 'green' | 'yellow' | 'red' = 'green'; // Default to 'green'
    if (alertCount == 48) {
      color = 'red';
    } else if (alertCount > 0) {
      color = 'yellow';
    }

    return { color };
    console.warn(`⚠️ Invalid color in fact:`, color);
    return { color: 'gray'};
  } catch (err) {
    console.error(`❌ Error retrieving facts for entity:`, err);
    return { color: 'gray'};
  }
}
