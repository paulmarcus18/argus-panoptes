import { CatalogApi } from '@backstage/catalog-client';
import { Entity } from '@backstage/catalog-model';

export async function getReposBySystem(catalogApi: CatalogApi): Promise<Record<string, string[]>> {
  const { items: entities } = await catalogApi.getEntities({
    filter: { kind: 'Component' },
  });

  const reposBySystem: Record<string, string[]> = {};

  for (const entity of entities) {
    const slug = entity.metadata.name;
    const system = (entity.spec as { system?: unknown })?.system;

    if (slug && typeof system === 'string') {
      if (!reposBySystem[system]) {
        reposBySystem[system] = [];
      }
      reposBySystem[system].push(slug);
    }
  }

  return reposBySystem;
}

