import { TechInsightsApi } from '@backstage/plugin-tech-insights';
import { Entity } from '@backstage/catalog-model';

export type TrafficLightColor = 'green' | 'yellow' | 'red' | 'gray' | 'white';

export const getDependabotStatusFromFacts = async (
  techInsightsApi: TechInsightsApi,
  entities: Entity[],
): Promise<TrafficLightColor> => {
  try {
    const results = await Promise.all(
      entities.map(async entity => {
        const entityRef = {
          kind: entity.kind,
          namespace: entity.metadata.namespace || 'default',
          name: entity.metadata.name,
        };

        const factsArray = await techInsightsApi.getFacts(entityRef, ['dependabot:status']);
        console.log('📦 Received facts for', entityRef.name, factsArray);

        const status = factsArray[0]?.facts?.['dependabot:status'] as TrafficLightColor | undefined;

        if (!status) {
          console.warn(`⚠️ Missing 'dependabot:status' fact for ${entityRef.name}`);
          return 'white';
        }

        return status;
      }),
    );

    if (results.includes('red')) return 'red';
    if (results.includes('yellow') || results.includes('gray')) return 'yellow';
    if (results.length > 0 && results.every(color => color === 'green')) return 'green';

    return 'white';
  } catch (err) {
    console.error('❌ Error retrieving dependabot facts:', err);
    return 'gray';
  }
};
