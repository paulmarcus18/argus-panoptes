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
  let totalAlertCount = 0;
  let validFactCount = 0;

  for(const entity of entities) {
    const entityRef = getCompoundEntityRef(entity);
    console.log(`📛 entityRef:`, entityRef);

  try {
    const facts = await techInsightsApi.getFacts(entityRef,['dependabotFactRetriever']);
    let factObj = facts['dependabotFactRetriever'];

  // if (!factObj) {
  //   console.warn(`⚠️ dependabot:status not found in facts`, facts);
  //   return { color: 'gray'};
  // }
    console.log(`🔍 Raw fact value:`, factObj);
    console.log(`🧪 Type of fact:`, typeof factObj);

    if (
      factObj &&
      typeof factObj === 'object' &&
      factObj.facts &&
      typeof factObj.facts === 'object' &&
      ('alertCount' in factObj.facts)
    ) {
      const alertCount = factObj.facts.alertCount;
      console.log(`📦 alertCount for ${entityRef}:`, alertCount);
      
      if(typeof alertCount === 'number') {
        totalAlertCount += alertCount;
        validFactCount++;
      }
    } else {
      console.warn(`⚠️ Malformed dependabot fact:`, factObj);
    }
  } catch(err) {
    console.error(`❌ Error retrieving facts for entity:`, err);
  }
}

if (validFactCount === 0) {
  console.warn(`⚠️ No valid dependabot facts found`);
  return { color: 'gray'};
}

let color: 'green' | 'yellow' | 'red' = 'green'; // Default to 'green'

if (totalAlertCount == 111) {
    color = 'red';
  } else if (totalAlertCount > 0) {
    color = 'yellow';
  }

  console.log(`🧮 Total alert count: ${totalAlertCount} → color: ${color}`);
  return { color };
}







