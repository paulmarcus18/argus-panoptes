import { TechInsightsApi } from '@backstage/plugin-tech-insights';
import { Entity, getCompoundEntityRef } from '@backstage/catalog-model';
import { CatalogApi } from '@backstage/plugin-catalog-react';

async function getPreProductionPipelineThresholdsFromSystem(
  systemName: string,
  catalogApi: CatalogApi,
): Promise<{ maxFailures: number; minSuccessRate: number }> {
  try {
    const { items: systems } = await catalogApi.getEntities({
      filter: { kind: 'System', 'metadata.name': systemName },
    });

    const system = systems[0];
    const annotation = system?.metadata?.annotations?.['pipeline/thresholds'];

    console.log(
      '📥 Raw system entities fetched:',
      systems.map(s => s.metadata.name),
    );
    console.log('📒 Raw annotation string:', annotation);

    if (annotation) {
      try {
        const parsed = JSON.parse(annotation);
        return {
          maxFailures: parsed.maxFailures ?? 1,
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

  // Default fallback
  return { maxFailures: 1, minSuccessRate: 90 };
}

export async function getPreProductionPipelineStatusFromFacts(
  techInsightsApi: TechInsightsApi,
  entities: Entity[],
  systemName?: string,
  catalogApi?: CatalogApi,
): Promise<{ color: 'green' | 'yellow' | 'red' | 'gray'; reason: string }> {
  if (!entities.length) {
    console.warn('⚠️ No entities provided to getPipelineStatusFromFacts');
    return { color: 'gray', reason: 'No entities provided' };
  }

  let totalSuccess = 0;
  let totalFailure = 0;
  let validCount = 0;

  for (const entity of entities) {
    const entityRef = getCompoundEntityRef(entity);
    try {
      const facts = await techInsightsApi.getFacts(entityRef, [
        'githubPipelineStatusFactRetriever',
      ]);
      const factObj = facts['githubPipelineStatusFactRetriever']?.facts;

      if (factObj) {
        if (typeof factObj.successWorkflowRunsCount === 'number') {
          totalSuccess += factObj.successWorkflowRunsCount;
        }
        if (typeof factObj.failureWorkflowRunsCount === 'number') {
          totalFailure += factObj.failureWorkflowRunsCount;
        }
        validCount++;
      } else {
        console.warn(`⚠️ No valid pipeline fact for ${entityRef.name}`);
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
      ? await getPreProductionPipelineThresholdsFromSystem(
          systemName,
          catalogApi,
        )
      : { maxFailures: 1, minSuccessRate: 90 };

  const totalRuns = totalSuccess + totalFailure;
  const successRate = totalRuns > 0 ? (totalSuccess / totalRuns) * 100 : 0;

  console.log(
    `📊 Thresholds - maxFailures: ${thresholds.maxFailures}, minSuccessRate: ${thresholds.minSuccessRate}%`,
  );
  console.log(
    `📦 Totals - Success: ${totalSuccess}, Failure: ${totalFailure}, SuccessRate: ${successRate.toFixed(
      2,
    )}%`,
  );

  let color: 'green' | 'yellow' | 'red' = 'green';
  let reason = '';

  if (totalFailure > thresholds.maxFailures) {
    color = 'red';
    reason = `Failures exceed threshold (${totalFailure} > ${thresholds.maxFailures})`;
  } else if (successRate < thresholds.minSuccessRate) {
    color = 'yellow';
    reason = `Success rate below threshold (${successRate.toFixed(2)}% < ${
      thresholds.minSuccessRate
    }%)`;
  } else {
    reason = `Pipeline performance within acceptable thresholds`;
  }

  return { color, reason };
}
