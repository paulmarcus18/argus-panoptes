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
  const catalogApi = useApi(catalogApiRef);

  const githubASUtils = React.useMemo(
    () => new GithubAdvancedSecurityUtils(),
    [techInsightsApi],
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!entities.length) {
        setColor('gray');
        setReason('No entities selected');
        return;
      }
      // Get the system name from the first entity
      const systemName = entities[0].spec?.system;
      if (!systemName) {
        setColor('gray');
        setReason('No system name found in entities');
        return;
      }

      // Fetch system entity metadata from catalog
      const systemEntity = await catalogApi.getEntityByRef({
        kind: 'System',
        namespace: entities[0].metadata.namespace || 'default',
        name: typeof systemName === 'string' ? systemName : String(systemName),
      });

      // Thresholds used when the user selects the system
      const system_critical_threshold_red = parseFloat(
        systemEntity?.metadata.annotations?.['github-advanced-security-system-critical-threshold-red'] || '0',
      );
      const system_high_threshold_red = parseFloat(
        systemEntity?.metadata.annotations?.['github-advanced-security-system-high-threshold-red'] || '0',
      );
      const system_secrets_threshold_red = parseFloat(
        systemEntity?.metadata.annotations?.['github-advanced-security-system-secrets-threshold-red'] || '0',
      );
      const system_medium_threshold_red = parseFloat(
        systemEntity?.metadata.annotations?.['github-advanced-security-system-medium-threshold-red'] || '0.5',
      )*entities.length;
      const system_medium_threshold_yellow = parseFloat(  
        systemEntity?.metadata.annotations?.['github-advanced-security-system-medium-threshold-yellow'] || '0.1',
      )*entities.length;
      const system_low_threshold_yellow = parseFloat(
        systemEntity?.metadata.annotations?.['github-advanced-security-system-low-threshold-yellow'] || '0.2',
      )*entities.length;

      // Thresholds used when the user selects critical in the system
      const system_critical_critical_threshold_red = parseFloat(
        systemEntity?.metadata.annotations?.['github-advanced-security-system-critical-critical-threshold-red'] || '0',
      );
      const system_critical_high_threshold_red = parseFloat(
        systemEntity?.metadata.annotations?.['github-advanced-security-system-critical-high-threshold-red'] || '0',
      );
      const system_critical_secrets_threshold_red = parseFloat(
        systemEntity?.metadata.annotations?.['github-advanced-security-system-critical-secrets-threshold-red'] || '0',
      );
      const system_critical_medium_threshold_red = parseFloat(
        systemEntity?.metadata.annotations?.['github-advanced-security-system-critical-medium-threshold-red'] || '0.33',
      )*entities.length;
      const system_critical_medium_threshold_yellow = parseFloat(  
        systemEntity?.metadata.annotations?.['github-advanced-security-system-critical-med-threshold-yellow'] || '0.2',
      )*entities.length;
      const system_critical_low_threshold_yellow = parseFloat(
        systemEntity?.metadata.annotations?.['github-advanced-security-system-critical-low-threshold-yellow'] || '0.1',
      )*entities.length;
     


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
