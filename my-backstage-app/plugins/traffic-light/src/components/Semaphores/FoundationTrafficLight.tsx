import React, { useEffect, useState } from 'react';
import { Entity } from '@backstage/catalog-model';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
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

        if (failures === 0) {
          setColor('green');
          setReason('All foundation checks passed');
        } else if (failures > entities.length / 3) {
          setColor('red');
          setReason(`${failures} foundation failures`);
        } else {
          setColor('yellow');
          setReason(`${failures} minor issues in foundation pipelines`);
        }
      } catch (err) {
        console.error('Foundation error:', err);
        setColor('gray');
        setReason('Error fetching foundation pipeline data');
      }
    };

    fetchData();
  }, [entities, techInsightsApi]);

  return <BaseTrafficLight color={color} tooltip={reason} onClick={onClick} />;
};
