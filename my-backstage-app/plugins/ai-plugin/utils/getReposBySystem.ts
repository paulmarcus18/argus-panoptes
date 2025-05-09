import { CatalogApi } from '@backstage/catalog-client';
import { CompoundEntityRef } from '@backstage/catalog-model';

export async function getReposBySystem(
  catalogApi: CatalogApi,
): Promise<Record<string, CompoundEntityRef[]>> {
  console.log('📦 Fetching all components from catalog...');

  const { items: entities } = await catalogApi.getEntities({
    filter: { kind: 'Component' },
  });

  const reposBySystem: Record<string, CompoundEntityRef[]> = {};

  for (const entity of entities) {
    const system = (entity.spec as { system?: unknown })?.system;

    if (typeof system === 'string') {
      const entityRef = {
        name: entity.metadata.name,
        namespace: entity.metadata.namespace || 'default',
        kind: entity.kind, // usually "component"
      }; // full { kind, namespace, name }

      if (!reposBySystem[system]) {
        reposBySystem[system] = [];
      }

      reposBySystem[system].push(entityRef);
    }
  }

  return reposBySystem;
}
