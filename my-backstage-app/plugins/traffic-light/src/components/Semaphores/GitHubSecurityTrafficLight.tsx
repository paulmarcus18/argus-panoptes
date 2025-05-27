import React, { useEffect, useState } from 'react';
import { Entity } from '@backstage/catalog-model';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { getGitHubSecurityFacts } from '../utils';
import { BaseTrafficLight } from './BaseTrafficLight';

export const GitHubSecurityTrafficLight = ({
  entities,
  onClick,
}: {
  entities: Entity[];
  onClick?: () => void;
}) => {
  const [color, setColor] = useState<
    'green' | 'yellow' | 'red' | 'gray' | 'white'
  >('white');
  const [reason, setReason] = useState('Loading GitHub Security data...');
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
            getGitHubSecurityFacts(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            }),
          ),
        );

        let critical = 0,
          high = 0,
          medium = 0,
          low = 0;

        results.forEach(res => {
          Object.values(res.codeScanningAlerts || {}).forEach(alert => {
            switch (alert.severity) {
              case 'critical':
                critical++;
                break;
              case 'high':
                high++;
                break;
              case 'medium':
                medium++;
                break;
              case 'low':
                low++;
                break;
              default:
                medium++;
            }
          });
          Object.values(res.secretScanningAlerts || {}).forEach(() => {
            high++;
          });
        });

        const total = critical + high + medium + low;

        if (critical > 0 || high > 0) {
          setColor('red');
          setReason(`${critical} critical, ${high} high issues`);
        } else if (medium > 0 || low > 0) {
          setColor('yellow');
          setReason(`${medium} medium, ${low} low issues`);
        } else if (total === 0) {
          setColor('green');
          setReason('No security issues found');
        }
      } catch (err) {
        console.error('GitHub Security error:', err);
        setColor('gray');
        setReason('Failed to load GitHub Security data');
      }
    };

    fetchData();
  }, [entities, techInsightsApi]);

  return <BaseTrafficLight color={color} tooltip={reason} onClick={onClick} />;
};
