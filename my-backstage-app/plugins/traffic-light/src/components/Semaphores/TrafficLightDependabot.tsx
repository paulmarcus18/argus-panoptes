import React, { useEffect, useState } from 'react';
import { BaseTrafficLight } from './BaseTrafficLight';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { Entity } from '@backstage/catalog-model';
import { DependabotUtils } from '../../utils/dependabotUtils';
import { catalogApiRef } from '@backstage/plugin-catalog-react';

export const determineDependabotColor = async(
  systemName: string,
  entities: Entity[],
  catalogApi: any,
  techInsightsApi: any,
  dependabotUtils: DependabotUtils
): Promise<{color: 'green' | 'red' | 'yellow' | 'gray' , reason: string}> => {
//   if (!Array.isArray(entities) || entities.length === 0) {
//     console.log('📦 determineDependabotColor called with entities:', entities);
//     return { color: 'gray', reason: 'No entities provided' };
// }
      const filteredEntities = entities.filter(
        e => e.spec?.system === systemName
      );

      if (!systemName || !Array.isArray(entities) || filteredEntities.length === 0) {
        console.log('📦 determineDependabotColor called with entities:', entities);
        return { color: 'gray', reason: `No entities found for system: ${systemName}` };
      }
  // if (!entities.length) {
  //     return { color: 'gray', reason: 'No entities available' };
  //   }
      const fallbackEntity = entities.find(e => typeof e.spec?.system === 'string');
      const fallbackSystem = fallbackEntity?.spec?.system;
      const finalSystemName = systemName ?? fallbackSystem;
      const finalSystemNameString = typeof finalSystemName === 'string' ? finalSystemName : undefined;

      console.log('🔌 Checking Dependabot status for entities:', filteredEntities.map(e => e.metadata.name));
      console.log('🧭 Using system name for threshold:', finalSystemNameString);
    
      if (!finalSystemNameString) {
      return { color: 'gray', reason: 'No valid system name available' };
      } 


      try {
        const result = await Promise.all(
          filteredEntities.map(entity =>
            dependabotUtils.getDependabotChecks(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            }),
          ),
        );
        	const totalChecks = result.reduce(
          (acc,res) => {
            acc.critical += res.criticalAlertCheck === false ?  1:0;
            acc.high += res.highAlertCheck === false ? 1 : 0;
            acc.medium += res.mediumAlertCheck === false ? 1 : 0;
            return acc; 
          },
          {
            critical: 0,
            high: 0,
            medium: 0,
          }, 
          
          );
        //issue is if facts and threshold not found, check returns false, and then code thinks the repo(s) failed checks but theres no facts actually
        //no high repo and no critical repo -> green
        if (totalChecks.high === 0 && totalChecks.critical === 0) {
          return { color: 'green', reason: 'All dependabot checks passed' };
          console.log(`${totalChecks.critical} alerts found`)
        } else if (totalChecks.critical > 0 ) {

          //if atleast 1 critical repo -> red
            console.log(`${totalChecks.critical} alerts found`)
            return { color: 'red', reason: `Critical alerts exceed threshold (${totalChecks.critical} > ${entities.length * 0.5})` };
        } else {
          return { color: 'yellow', reason: `${totalChecks.critical} minor critical issues in dependabot alerts` };
          console.log(`${totalChecks.critical} alerts found`)
        }

      } catch (err) {
        return { color: 'gray', reason: 'Error fetching dependabot data' };
        console.error('Dependabot error:', err);
      }
    };


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
    'green' | 'red' | 'yellow' | 'gray' 
  >('gray');
  const [reason, setReason] = useState('Fetching Dependabot status...')

  const techInsightsApi = useApi(techInsightsApiRef);
  const catalogApi = useApi(catalogApiRef);
  const dependabotUtils = React.useMemo(
      () => new DependabotUtils(),
      [techInsightsApi],
    );

  useEffect(() => {
      if (!entities.length) {
      setColor('gray');
      setReason('No entities selected');
      return ;
    }

    console.log('🚦 Rendering with entities:', entities);
      const fetchData = async () => {
      //   if (!Array.isArray(entities) || entities.length === 0) {
      //   setColor('gray');
      //   setReason('No entities selected');
      //   return;
      // }

      const filteredEntities = entities.filter(
        e => e.spec?.system === systemName
      );

      if (!systemName || filteredEntities.length === 0) {
        setColor('gray');
        setReason(`No entities found for system: ${systemName}`);
        return;
      }
      const dependabotColorAndReason = await determineDependabotColor(
        systemName,
        filteredEntities,
        catalogApi,
        techInsightsApi,
        dependabotUtils
      );

      setColor(dependabotColorAndReason.color);
      setReason(dependabotColorAndReason.reason);
    };
    fetchData();
  }, [entities, techInsightsApi]);


  return <BaseTrafficLight color={color} tooltip={reason} onClick={onClick} />;
};
