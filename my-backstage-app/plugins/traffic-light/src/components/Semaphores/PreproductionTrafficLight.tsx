import React, { useEffect, useState } from 'react';
import { Entity } from '@backstage/catalog-model';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { getPreproductionPipelineChecks } from '../../utils/preproductionUtils';
import { BaseTrafficLight } from './BaseTrafficLight';

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

  const preproductionUtils = React.useMemo(
    () => new PreproductionUtils(),
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
        const results = await Promise.all(
          entities.map(entity =>
            getPreproductionPipelineChecks(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            }),
          ),
        );

        const failures = results.filter(
          r => r.successRateCheck === false,
        ).length;

        if (failures === 0) {
          setColor('green');
          setReason('All preproduction checks passed');
        } else if (failures > entities.length / 3) {
          setColor('red');
          setReason(`${failures} preproduction failures`);
        } else {
          setColor('yellow');
          setReason(`${failures} minor issues in pipelines`);
        }
      } catch (err) {
        console.error('Preproduction error:', err);
        setColor('gray');
        setReason('Error fetching preproduction pipeline data');
      }
    };

    fetchData();
  }, [entities, techInsightsApi]);

  return <BaseTrafficLight color={color} tooltip={reason} onClick={onClick} />;
};
