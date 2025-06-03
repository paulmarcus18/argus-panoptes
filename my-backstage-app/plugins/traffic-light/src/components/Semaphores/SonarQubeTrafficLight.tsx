import React, { useEffect, useState } from 'react';
import { Entity } from '@backstage/catalog-model';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { SonarCloudUtils} from '../../utils/sonarCloudUtils';
import { BaseTrafficLight } from './BaseTrafficLight';

/**
 * SonarQubeTrafficLight is a React component that displays a colored traffic light indicator
 * representing the overall SonarQube quality status for a set of entities.
 *
 * The component fetches SonarQube quality gate status for each provided entity using the Tech Insights API,
 * aggregates the results, and determines the appropriate traffic light color:
 * - Green: The number of entities that failed the quality gate is below the yellow threshold (set in system file).
 * - Yellow: The number of entities that failed the quality gate is between the yellow threshold and the red threshold(set in system file).
 * - Red: The number of entities that failed the quality gate is above the red threshold (set in system file).
 * - Gray: No entities are selected, data cannot be retrieved or threshold cannot be retrieved.
 *
 * The component also displays a tooltip with a summary of the check results or error messages.
 *
 * @param entities - An array of Backstage Entity objects to check SonarQube status for.
 * @param onClick - Optional click handler for the traffic light indicator.
 * @returns A React element rendering the traffic light with a tooltip.
 */
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
  const catalogApi = useApi(catalogApiRef);
  const sonarUtils = React.useMemo(
      () => new SonarCloudUtils(),
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
        setReason('System metadata is missing');
        return;
      }

      // Fetch system entity metadata from catalog
        const systemEntity = await catalogApi.getEntityByRef({
          kind: 'system',
          namespace: 'default',
          name: typeof systemName === 'string' ? systemName : String(systemName)
        });

      // Get thresholds for traffic light colour from system annotations
      const redThreshold = parseFloat(
        systemEntity?.metadata.annotations?.['tech-insights.io/sonarcloud-quality-gate-red-threshold-percentage'] || '50'
      );
      const yellowThreshold = parseFloat(
        systemEntity?.metadata.annotations?.['tech-insights.io/sonarcloud-quality-gate-yellow-threshold-percentage'] || '25'
      );

      try {
        const results = await Promise.all(
          entities.map(entity =>
            sonarUtils.getSonarQubeChecks(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            }),
          ),
        );

        const totalFailedQualityGate = results.reduce(
          (acc, res) => {
            acc += res.quality_gate !== 'OK' ? 1 : 0;
            return acc;
          },
          0,
        );

        // If the number of entities that failed the quality gate check is above the red threshold
        // Set the colour to red
        if (totalFailedQualityGate >= redThreshold * entities.length / 100) {
          setColor('red');
          setReason(
            `${totalFailedQualityGate} entities failed the quality gate check`,
          );
        } else if (totalFailedQualityGate >= yellowThreshold * entities.length / 100) {	
          // If the number of entities that failed the quality gate check is between the red and the yellow threshold
          // Set the colour to yellow
          setColor('yellow');
          setReason(
            `${totalFailedQualityGate} entities failed the quality gate check`,
          );
        }	 else {
          // If the number of entities that failed the quality gate check is below the yellow threshold
          // Set the colour to green 
          setColor('green');
          setReason(
            `${totalFailedQualityGate} entities failed the quality gate check`,
          );
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
