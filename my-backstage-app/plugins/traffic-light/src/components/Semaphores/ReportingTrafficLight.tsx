import React, { useEffect, useState } from 'react';
import { Entity } from '@backstage/catalog-model';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { ReportingUtils } from '../../utils/reportingUtils';
import { BaseTrafficLight } from './BaseTrafficLight';

interface ReportingTrafficLightProps {
  entities: Entity[];
  onClick?: () => void;
}

/**
 * ReportingTrafficLight is a React component that displays a colored traffic light indicator
 * representing the overall Reporting pipeline quality status for a set of entities.
 *
 * @param entities - An array of Backstage Entity objects to check Reporting pipeline status for.
 * @param onClick - Optional click handler for the traffic light indicator.
 * @returns A React element rendering the traffic light with a tooltip.
 */
export const ReportingTrafficLight = ({
  entities,
  onClick,
}: ReportingTrafficLightProps) => {
  const [color, setColor] = useState<
    'green' | 'yellow' | 'red' | 'gray' | 'white'
  >('white');
  const [reason, setReason] = useState('Loading Reporting pipeline data...');
  const techInsightsApi = useApi(techInsightsApiRef);

  const reportingUtils = React.useMemo(
    () => new ReportingUtils(),
    [techInsightsApi],
  );

  useEffect(() => {
    const fetchReportingData = async () => {
      if (!entities.length) {
        setColor('gray');
        setReason('No entities selected');
        return;
      }

      try {
        const reportingCheckResults = await Promise.all(
          entities.map(entity =>
            reportingUtils.getReportingPipelineChecks(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            }),
          ),
        );

        const failures = reportingCheckResults.filter(
          r => r.successRateCheck === false,
        ).length;

        if (failures === 0) {
          setColor('green');
          setReason('All Reporting pipeline checks passed for all entities');
        } else if (failures > entities.length / 3) {
          setColor('red');
          setReason(`${failures} entities failed the success rate check`);
        } else {
          setColor('yellow');
          setReason(`${failures} entities failed the success rate check`);
        }
      } catch (err) {
        console.error('Error fetching Reporting pipeline data:', err);
        setColor('gray');
        setReason('Failed to retrieve Reporting pipeline data');
      }
    };

    fetchReportingData();
  }, [entities, techInsightsApi]);

  return <BaseTrafficLight color={color} tooltip={reason} onClick={onClick} />;
};