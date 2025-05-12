import { CatalogApi } from '@backstage/catalog-client';
import { CompoundEntityRef, Entity } from '@backstage/catalog-model';

/**
 * Processes a list of entities and groups them by system.
 */
export function getReposBySystemFromEntities(
  entities: Entity[],
): Record<string, CompoundEntityRef[]> {
  // Initialize an empty record
  const reposBySystem: Record<string, CompoundEntityRef[]> = {};

  /**
   * Goes through each entity at a time and
   * processes it.
   */
  for (const entity of entities) {
    // Gets the system of the entity
    const system = (entity.spec as { system?: unknown })?.system;

    /**
     * If the system is not undefined,
     * creates an entityRef of the type CompoundEntityRef
     * which can be added to the reposBySystem variable.
     */
    if (typeof system === 'string') {
      const entityRef: CompoundEntityRef = {
        name: entity.metadata.name,
        namespace: entity.metadata.namespace || 'default',
        kind: entity.kind,
      };

      /**
       * If a certain system is not initialized in the
       * dictionary, then it is initialized.
       */
      if (!reposBySystem[system]) {
        reposBySystem[system] = [];
      }

      // The entity ref is added to reposBySystem.
      reposBySystem[system].push(entityRef);
    }
  }

  return reposBySystem;
}

/**
 * This is a wrapper function that
 * fetches all components and returns them grouped by system.
 */
export async function getReposBySystem(
  catalogApi: CatalogApi,
): Promise<Record<string, CompoundEntityRef[]>> {
  console.log('📦 Fetching all components from catalog...');

  /**
   * Calles the catalogApi to get all components and then filters
   * them based on their kind.
   */
  const { items: entities } = await catalogApi.getEntities({
    filter: { kind: 'Component' },
  });

  return getReposBySystemFromEntities(entities);
}
