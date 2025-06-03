import React, { useEffect, useState } from 'react';
import { Entity } from '@backstage/catalog-model';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { FoundationUtils } from '../../utils/foundationUtils';
import { BaseTrafficLight } from './BaseTrafficLight';

export const FoundationTrafficLight = ({
  entities,
  onClick,
}: {
  entities: Entity[];
  onClick?: () => void;
}) => {
  const [color, setColor] = useState<
    'green' | 'yellow' | 'red' | 'gray' | 'white'
  >('white');
  const [reason, setReason] = useState('Loading Foundation pipeline data...');
  const techInsightsApi = useApi(techInsightsApiRef);
  const catalogApi = useApi(catalogApiRef);

  const foundationUtils = React.useMemo(
    () => new FoundationUtils(),
    [techInsightsApi],
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!entities.length) {
        setColor('gray');
        setReason('No entities selected');
        return;
      }

      try {
        // Step 1: Determine system entity (assumes all entities belong to the same system)
        const systemName = entities[0].spec?.system;
        const namespace = entities[0].metadata.namespace || 'default';

        const systemEntity = systemName
          ? await catalogApi.getEntityByRef({
              kind: 'System',
              namespace,
              name:
                typeof systemName === 'string'
                  ? systemName
                  : String(systemName),
            })
          : null;

        // Step 2: Get threshold from annotation or default to 0.33 (i.e. 1/3)
        const redThresholdRaw =
          systemEntity?.metadata.annotations?.[
            'foundation-check-threshold-red'
          ] || '0.33';
        const redThreshold = parseFloat(redThresholdRaw);

        // Step 3: Get foundation results
        const results = await Promise.all(
          entities.map(entity =>
            foundationUtils.getFoundationPipelineChecks(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            }),
          ),
        );

        const failures = results.filter(
          r => r.successRateCheck === false,
        ).length;

        // Step 4: Apply modular logic
        const { color: newColor, reason: newReason } = determineFoundationColor(
          failures,
          entities.length,
          redThreshold,
        );

        setColor(newColor);
        setReason(newReason);
      } catch (err) {
        console.error('Foundation error:', err);
        setColor('gray');
        setReason('Error fetching foundation pipeline data');
      }
    };

    fetchData();
  }, [entities, techInsightsApi, catalogApi]);

  return <BaseTrafficLight color={color} tooltip={reason} onClick={onClick} />;
};

// Modular logic with threshold
export function determineFoundationColor(
  failures: number,
  totalEntities: number,
  redThreshold: number,
): { color: 'green' | 'yellow' | 'red'; reason: string } {
  const redLimit = Math.ceil(redThreshold * totalEntities);

  if (failures === 0) {
    return { color: 'green', reason: 'All foundation checks passed' };
  } else if (failures > redLimit) {
    return { color: 'red', reason: `${failures} foundation failures` };
  } else {
    return {
      color: 'yellow',
      reason: `${failures} minor issues in foundation pipelines`,
    };
  }
}
