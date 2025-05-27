import React, { useEffect, useState } from 'react';
import { Entity } from '@backstage/catalog-model';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { GithubAdvancedSecurityUtils } from '../../utils/githubAdvancedSecurityUtils';
import { BaseTrafficLight } from './BaseTrafficLight';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Box, Tooltip } from '@material-ui/core';

// export const GitHubSecurityTrafficLight = ({
//   entities,
//   onClick,
// }: {
//   entities: Entity[];
//   onClick?: () => void;
// }) => {
//   const [color, setColor] = useState<
//     'green' | 'yellow' | 'red' | 'gray' | 'white'
//   >('white');
//   const [reason, setReason] = useState('Loading GitHub Security data...');
//   const techInsightsApi = useApi(techInsightsApiRef);

//   useEffect(() => {
//     const fetchData = async () => {
//       if (!entities.length) {
//         setColor('gray');
//         setReason('No entities selected');
//         return;
//       }

//       try {
//         const results = await Promise.all(
//           entities.map(entity =>
//             getGitHubSecurityFacts(techInsightsApi, {
//               kind: entity.kind,
//               namespace: entity.metadata.namespace || 'default',
//               name: entity.metadata.name,
//             }),
//           ),
//         );

//         let critical = 0,
//           high = 0,
//           medium = 0,
//           low = 0;

//         results.forEach(res => {
//           Object.values(res.codeScanningAlerts || {}).forEach(alert => {
//             switch (alert.severity) {
//               case 'critical':
//                 critical++;
//                 break;
//               case 'high':
//                 high++;
//                 break;
//               case 'medium':
//                 medium++;
//                 break;
//               case 'low':
//                 low++;
//                 break;
//               default:
//                 medium++;
//             }
//           });
//           Object.values(res.secretScanningAlerts || {}).forEach(() => {
//             high++;
//           });
//         });

//         const total = critical + high + medium + low;

//         if (critical > 0 || high > 0) {
//           setColor('red');
//           setReason(`${critical} critical, ${high} high issues`);
//         } else if (medium > 0 || low > 0) {
//           setColor('yellow');
//           setReason(`${medium} medium, ${low} low issues`);
//         } else if (total === 0) {
//           setColor('green');
//           setReason('No security issues found');
//         }
//       } catch (err) {
//         console.error('GitHub Security error:', err);
//         setColor('gray');
//         setReason('Failed to load GitHub Security data');
//       }
//     };

//     fetchData();
//   }, [entities, techInsightsApi]);

//   return <BaseTrafficLight color={color} tooltip={reason} onClick={onClick} />;
// };

// Github Security Traffic Component
interface GitHubSecurityTrafficLightProps {
  entities: Entity[];
  onClick?: () => void;
}

// Update the GitHubSecurityTrafficLight component
export const GitHubSecurityTrafficLight = ({
  entities,
  onClick,
}: GitHubSecurityTrafficLightProps) => {
  const [color, setColor] = useState<
    'green' | 'red' | 'yellow' | 'gray' | 'white'
  >('white');
  const [reason, setReason] = useState<string>(
    'Loading GitHub Security data...',
  );
  const techInsightsApi = useApi(techInsightsApiRef);
  const catalogApi = useApi(catalogApiRef);

  const githubASUtils = React.useMemo(
    () => new GithubAdvancedSecurityUtils(),
    [techInsightsApi],
  );

  useEffect(() => {
    const fetchGitHubSecurityData = async () => {
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
        // Get the results of the SonarQube fact checks for all entities
        const securityData = await Promise.all(
          entities.map(entity =>
            githubASUtils.getGitHubSecurityFacts(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            }),
          ),
        );
        

      // Count total number of failed checks for each metric
      // Count total number of failed checks for each metric and track entity names
      const totalChecks = securityData.reduce(
        (acc, result, index) => {
          // Get the entity name from the entities array using the same index
          const entityName = entities[index].metadata.name;

          // Track issues along with entity names
          if (result.criticalCheck === true) {
            acc.criticalCheckTrue += 1;
            acc.criticalEntities.push(entityName);
          }
          
          if (result.highCheck === true) {
            acc.highCheckTrue += 1;
            acc.highEntities.push(entityName);
          }
          
          if (result.mediumCheck === true) {
            acc.mediumCheckTrue += 1; 
            acc.mediumEntities.push(entityName);
          }
          
          if (result.lowCheck === true) {
            acc.lowCheckTrue += 1;
            acc.lowEntities.push(entityName);
          }
          
          if (result.secretCheck === true) {
            acc.secretCheckTrue += 1;
            acc.secretEntities.push(entityName);
          }
          
          return acc;
        },
        {
          criticalCheckTrue: 0,
          highCheckTrue: 0,
          mediumCheckTrue: 0,
          lowCheckTrue: 0,
          secretCheckTrue: 0,
          criticalEntities: [] as string[],
          highEntities: [] as string[],
          mediumEntities: [] as string[],
          lowEntities: [] as string[],
          secretEntities: [] as string[]
        },
      );
      // Debug information
      console.log('Security data by entity:', securityData.map((result, i) => ({
        name: entities[i].metadata.name,
        criticalCheck: result.criticalCheck,
        highCheck: result.highCheck,
        mediumCheck: result.mediumCheck,
        lowCheck: result.lowCheck,
        secretCheck: result.secretCheck
      })));
          // Add entity names to tooltips
    if (totalChecks.mediumCheckTrue > system_medium_threshold_yellow || totalChecks.lowCheckTrue > system_low_threshold_yellow) {
      setColor('yellow');
      setReason(
        `Medium severity issues (${totalChecks.mediumCheckTrue}) in: ${totalChecks.mediumEntities.slice(0, 5).join(', ')}${totalChecks.mediumEntities.length > 5 ? '...' : ''}\n` +
        `Low severity issues (${totalChecks.lowCheckTrue}) in: ${totalChecks.lowEntities.slice(0, 5).join(', ')}${totalChecks.lowEntities.length > 5 ? '...' : ''}`
      );
    } else if (totalChecks.criticalCheckTrue > system_critical_threshold_red || totalChecks.secretCheckTrue > system_secrets_threshold_red || totalChecks.highCheckTrue > system_high_threshold_red || totalChecks.mediumCheckTrue > system_medium_threshold_red) {
      setColor('red');
      setReason(
        `Critical issues in: ${totalChecks.criticalEntities.join(', ') || 'None'}\n` +
        `Secret scanning issues in: ${totalChecks.secretEntities.join(', ') || 'None'}` + 
        `\nHigh severity issues in: ${totalChecks.highEntities.join(', ') || 'None'}` +
        `\nMedium severity issues in: ${totalChecks.mediumEntities.join(', ') || 'None'}`
      );
    } else {
      setColor('green');
      setReason('All GitHub security checks passed for all entities');
    }

      } catch (err) {
        console.error('Error fetching GitHub Security data:', err);
        setColor('gray');
        setReason('Failed to retrieve GitHub Security data');
      }
    };

    fetchGitHubSecurityData();
  }, [entities, techInsightsApi]);

return <Tooltip title={reason}>
      <div>
        <Box
          my={1}
          width={50}
          height={50}
          borderRadius="50%"
          bgcolor={color}
          onClick={onClick}
          style={onClick ? { cursor: 'pointer' } : {}}
        />
      </div>
    </Tooltip>;
 };
