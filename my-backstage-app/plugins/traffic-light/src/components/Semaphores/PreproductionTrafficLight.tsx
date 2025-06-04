import React, { useEffect, useState } from 'react';
import { Entity } from '@backstage/catalog-model';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { PreproductionUtils } from '../../utils/preproductionUtils';
import { BaseTrafficLight } from './BaseTrafficLight';
import { determineSemaphoreColor } from '../utils';

export const PreproductionTrafficLight = ({
  entities,
  onClick,
}: {
  entities: Entity[];
  onClick?: () => void;
}) => {
  const [color, setColor] = useState<
    'green' | 'yellow' | 'red' | 'gray' | 'white'
  >('white');
  const [reason, setReason] = useState(
    'Loading Preproduction pipeline data...',
  );
  const techInsightsApi = useApi(techInsightsApiRef);
  const catalogApi = useApi(catalogApiRef);

  const preproductionUtils = React.useMemo(() => new PreproductionUtils(), []);

  useEffect(() => {
    const fetchData = async () => {
      if (!entities.length) {
        setColor('gray');
        setReason('No entities selected');
        return;
      }

      try {
        // 1. Fetch red threshold from system annotation
        let redThreshold = 0.33;
        try {
          const systemName = entities[0].spec?.system;
          const namespace = entities[0].metadata.namespace || 'default';

          if (systemName) {
            const systemEntity = await catalogApi.getEntityByRef({
              kind: 'System',
              namespace,
              name:
                typeof systemName === 'string'
                  ? systemName
                  : String(systemName),
            });

            const thresholdAnnotation =
              systemEntity?.metadata.annotations?.[
                'preproduction-check-threshold-red'
              ];
            if (thresholdAnnotation) {
              redThreshold = parseFloat(thresholdAnnotation);
            }
          }
        } catch (err) {
          console.warn(
            'Failed to read preproduction red threshold; using default 0.33',
          );
        }

        // 2. Run preproduction pipeline checks
        const results = await Promise.all(
          entities.map(entity =>
            preproductionUtils.getPreproductionPipelineChecks(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            }),
          ),
        );

        const failures = results.filter(
          r => r.successRateCheck === false,
        ).length;

        // 3. Determine color and reason
        const { color: computedColor, reason: computedReason } =
          determineSemaphoreColor(failures, entities.length, redThreshold);

        setColor(computedColor);
        setReason(computedReason);
      } catch (err) {
        console.error('Preproduction error:', err);
        setColor('gray');
        setReason('Error fetching preproduction pipeline data');
      }
    };

    fetchData();
  }, [entities, techInsightsApi, catalogApi, preproductionUtils]);

  return <BaseTrafficLight color={color} tooltip={reason} onClick={onClick} />;
};
