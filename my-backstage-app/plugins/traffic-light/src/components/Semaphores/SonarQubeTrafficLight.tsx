import React, { useEffect, useState } from 'react';
import { Entity } from '@backstage/catalog-model';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { getSonarQubeChecks } from '../../utils/sonarCloudUtils';
import { BaseTrafficLight } from './BaseTrafficLight';

export const SonarQubeTrafficLight = ({
  entities,
  onClick,
}: {
  entities: Entity[];
  onClick?: () => void;
}) => {
  const [color, setColor] = useState<
    'green' | 'red' | 'yellow' | 'gray' | 'white'
  >('white');
  const [reason, setReason] = useState('Loading SonarQube data...');
  const techInsightsApi = useApi(techInsightsApiRef);

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
            getSonarQubeChecks(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            }),
          ),
        );

        const counts = results.reduce(
          (acc, res) => {
            acc.bugs += res.bugsCheck === false ? 1 : 0;
            acc.smells += res.codeSmellsCheck === false ? 1 : 0;
            acc.vulns += res.vulnerabilitiesCheck === false ? 1 : 0;
            acc.gate += res.qualityGateCheck === false ? 1 : 0;
            acc.coverage += res.codeCoverageCheck === false ? 1 : 0;
            return acc;
          },
          { bugs: 0, smells: 0, vulns: 0, gate: 0, coverage: 0 },
        );

        const redCount = Object.values(counts).filter(
          v => v > entities.length / 3,
        ).length;

        if (Object.values(counts).every(v => v === 0)) {
          setColor('green');
          setReason('All SonarQube checks passed');
        } else if (redCount >= 3) {
          setColor('red');
          setReason(`Multiple critical checks failed across entities`);
        } else {
          setColor('yellow');
          setReason(`Some quality issues detected`);
        }
      } catch (err) {
        console.error('SonarQube error:', err);
        setColor('gray');
        setReason('Error fetching SonarQube data');
      }
    };

    fetchData();
  }, [entities, techInsightsApi]);

  return <BaseTrafficLight color={color} tooltip={reason} onClick={onClick} />;
};
