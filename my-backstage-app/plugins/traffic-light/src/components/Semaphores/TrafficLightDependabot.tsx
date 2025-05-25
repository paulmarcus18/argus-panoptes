import React, { useEffect, useState } from 'react';
import { BaseTrafficLight } from './BaseTrafficLight';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { Entity } from '@backstage/catalog-model';
import { getDependabotStatusFromFacts } from '../../utils/factChecker';

export const TrafficLightDependabot = ({
  entities,
  onClick,
}: {
  entities: Entity[];
  onClick?: () => void;
}) => {
  const [color, setColor] = useState<
    'green' | 'red' | 'yellow' | 'gray' | 'white'
  >('white');
  const [reason, setReason] = useState('Fetching Dependabot status...');
  const techInsightsApi = useApi(techInsightsApiRef);

  useEffect(() => {
    if (!entities.length) {
      setColor('gray');
      setReason('No entities available');
      return;
    }

    const fetchStatus = async () => {
      const result = await getDependabotStatusFromFacts(
        techInsightsApi,
        entities,
      );
      setColor(result.color);
      setReason(`Dependabot: ${result.color.toUpperCase()}`);
    };

    fetchStatus();
  }, [techInsightsApi, entities]);

  return <BaseTrafficLight color={color} tooltip={reason} onClick={onClick} />;
};
