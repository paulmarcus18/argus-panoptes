import { TechInsightsApi } from '@backstage/plugin-tech-insights';
import { CompoundEntityRef } from '@backstage/catalog-model';

export type TrafficLightColor = 'green' | 'yellow' | 'red' | 'gray' | 'white';

export const getDependabotStatus = async (
  techInsightsApi: TechInsightsApi,
  entityRefs: CompoundEntityRef[],
): Promise<TrafficLightColor> => {
  try {
    
    const results = await Promise.all(
      entityRefs.map(async ref => {
        const factResponse = await techInsightsApi.getFacts(ref, ['dependabot:status']);
        const factMap = factResponse.facts as Record<string, { color?: TrafficLightColor }>;
        const value = factMap['dependabot:status'];
        return value?.color ?? 'white';
      }),
    );

    if (results.includes('red')) return 'red';
    if (results.includes('yellow') || results.includes('gray')) return 'yellow';
    if (results.length > 0 && results.every(c => c === 'green')) return 'green';

    return 'white';
  } catch (error) {
    console.error('Failed to fetch dependabot facts:', error);
    return 'gray';
  }
};
