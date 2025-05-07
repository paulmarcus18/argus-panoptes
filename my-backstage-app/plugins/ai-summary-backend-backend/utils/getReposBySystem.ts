import { CatalogClient } from '@backstage/catalog-client/index';

export async function getReposBySystem(
  catalogApi: CatalogClient,
): Promise<Record<string, string[]>> {
  console.log(
    '!!!!!!!!!!!!!!!The repo function is being accessed!!!!!!!!!!!!!!!!!!!',
  );

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
