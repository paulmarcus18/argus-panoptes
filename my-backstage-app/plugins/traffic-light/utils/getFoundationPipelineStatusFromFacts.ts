import { TechInsightsApi } from '@backstage/plugin-tech-insights';
import { CatalogApi } from '@backstage/plugin-catalog-react';
import { Entity, getCompoundEntityRef } from '@backstage/catalog-model';

async function getFoundationPipelineThresholdsFromSystem(
  systemName: string,
  catalogApi: CatalogApi,
): Promise<{ minSuccessRate: number }> {
  try {
    const { items: systems } = await catalogApi.getEntities({
      filter: { kind: 'System', 'metadata.name': systemName },
    });

    const system = systems[0];
    const annotation = system?.metadata?.annotations?.['foundation/thresholds'];

    if (annotation) {
      try {
        const parsed = JSON.parse(annotation);
        return {
          minSuccessRate: parsed.minSuccessRate ?? 90,
        };
      } catch (err) {
        console.warn(
          `❌ Failed to parse annotation JSON for system "${systemName}"`,
          err,
        );
      }
    }
  } catch (e) {
    console.warn(`⚠️ Could not fetch system "${systemName}" from catalog`, e);
  }

  return { minSuccessRate: 90 };
}

export async function getFoundationPipelineStatusFromFacts(
  techInsightsApi: TechInsightsApi,
  entities: Entity[],
  systemName?: string,
  catalogApi?: CatalogApi,
): Promise<{ color: 'green' | 'yellow' | 'red' | 'gray'; reason: string }> {
  if (!entities.length) {
    return { color: 'gray', reason: 'No entities provided' };
  }

  let totalSuccess = 0;
  let totalFailure = 0;
  let validCount = 0;

  for (const entity of entities) {
    const entityRef = getCompoundEntityRef(entity);
    try {
      const facts = await techInsightsApi.getFacts(entityRef, [
        'foundationPipelineStatusFactRetriever',
      ]);
      const factObj = facts['foundationPipelineStatusFactRetriever']?.facts;

      if (factObj) {
        const getNumber = (val: any): number =>
          typeof val === 'number' ? val : 0;
        totalSuccess += getNumber(factObj.successWorkflowRunsCount);
        totalFailure += getNumber(factObj.failureWorkflowRunsCount);
        validCount++;
      } else {
        console.warn(`⚠️ No pipeline fact for ${entityRef.name}`);
      }
    } catch (err) {
      console.error(`❌ Failed to fetch facts for ${entityRef.name}`, err);
    }
  }

  if (validCount === 0) {
    return { color: 'gray', reason: 'No valid facts available' };
  }

  const thresholds =
    catalogApi && systemName
      ? await getFoundationPipelineThresholdsFromSystem(systemName, catalogApi)
      : { minSuccessRate: 90 };

  const total = totalSuccess + totalFailure;
  const successRate = total > 0 ? (totalSuccess / total) * 100 : 0;

  console.log(
    `📊 Foundation Threshold: minSuccessRate = ${thresholds.minSuccessRate}%`,
  );
  console.log(`📦 Aggregated Success Rate: ${successRate.toFixed(2)}%`);

  if (successRate < thresholds.minSuccessRate) {
    return {
      color: successRate < thresholds.minSuccessRate * 0.8 ? 'red' : 'yellow',
      reason: `Success rate (${successRate.toFixed(2)}%) is below threshold (${
        thresholds.minSuccessRate
      }%)`,
    };
  }

  return {
    color: 'green',
    reason: `Pipeline success rate is ${successRate.toFixed(
      2,
    )}% and meets the threshold`,
  };
}
