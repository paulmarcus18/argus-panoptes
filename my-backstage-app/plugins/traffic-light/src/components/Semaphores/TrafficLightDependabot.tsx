import React, { useEffect, useState } from 'react';
import { BaseTrafficLight } from './BaseTrafficLight';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { Entity } from '@backstage/catalog-model';
import { getDependabotChecks } from '../../utils/dependabotUtils';
import { catalogApiRef } from '@backstage/plugin-catalog-react';

export const TrafficLightDependabot = ({
  entities,
  systemName,
  onClick,
}: {
  entities: Entity[];
  systemName: string;
  onClick?: () => void;
}) => {
  const [color, setColor] = useState<
    'green' | 'red' | 'yellow' | 'gray' | 'white'
  >('white');
  const [reason, setReason] = useState('Fetching Dependabot status...');
  const techInsightsApi = useApi(techInsightsApiRef);
  const catalogApi = useApi(catalogApiRef);

  useEffect(() => {
    if (!entities.length) {
      setColor('gray');
      setReason('No entities available');
      return;
    }

    const fetchStatus = async () => {
      const fallbackEntity = entities.find(e => typeof e.spec?.system === 'string');
      const fallbackSystem = fallbackEntity?.spec?.system;
      const finalSystemName = systemName ?? fallbackSystem;
      const finalSystemNameString = typeof finalSystemName === 'string' ? finalSystemName : undefined;

      console.log('🔌 Checking Dependabot status for entities:', entities.map(e => e.metadata.name));
      console.log('🧭 Using system name for threshold:', finalSystemNameString);

      try {
        const result = await Promise.all(
          entities.map(entity =>
            getDependabotChecks(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            }),
          ),
          // techInsightsApi,
          // entities,
          // finalSystemNameString ?? '',
          // catalogApi
        );


        const failures = result.filter(
          r => r.successRateCheck === false,
        ).length;

        //Color logic must be fixed!!
        if (failures === 0) {
          setColor('green');
          setReason('All dependabot checks passed');
        } else if (failures > entities.length / 3) {
          setColor('red');
          setReason(`${failures} dependabot failures`);
        } else {
          setColor('yellow');
          setReason(`${failures} minor issues in dependabot alerts`);
        }
      } catch (err) {
        console.error('Dependabot error:', err);
        setColor('gray');
        setReason('Error fetching dependabot data');
      }
    };

    fetchStatus();
  }, [techInsightsApi, entities]);

  return <BaseTrafficLight color={color} tooltip={reason} onClick={onClick} />;
};
