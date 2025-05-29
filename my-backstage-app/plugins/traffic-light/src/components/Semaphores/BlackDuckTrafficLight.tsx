import React, { useEffect, useState } from 'react';
import { Entity } from '@backstage/catalog-model';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { BlackDuckUtils } from '../../utils/blackDuckUtils';
import { BaseTrafficLight } from './BaseTrafficLight';

/**
 * BlackDuckTrafficLight is a React component that displays a colored traffic light indicator
 * representing the overall BlackDuck quality status for a set of entities.
 *
 * The component fetches BlackDuck check results for each provided entity using the Tech Insights API,
 * aggregates the results, and determines the appropriate traffic light color:
 * - Green: All checks pass for all entities
 * - Yellow: There are some security issues reported by BlackDuck, but no critical issues, and no checks were failed by at more than 1/3 of the entities
 * - Red: There are critical security issues reported by BlackDuck, or at least one check was failed by at least 1/3 of the entities
 * - Gray: Entity or system cannot be retrieved.
 *
 * The component also displays a tooltip with a summary of the check results or error messages.
 *
 * @param entities - An array of Backstage Entity objects to check SonarQube status for.
 * @param onClick - Optional click handler for the traffic light indicator.
 * @returns A React element rendering the traffic light with a tooltip.
 */
export const BlackDuckTrafficLight = ({
  entities,
  onClick,
}: {
  entities: Entity[];
  onClick?: () => void;
}) => {
  const [color, setColor] = useState<
    'green' | 'red' | 'yellow' | 'gray' | 'white'
  >('white');
  const [reason, setReason] = useState('Loading BlackDuck data...');
  const techInsightsApi = useApi(techInsightsApiRef);
  const catalogApi = useApi(catalogApiRef);

  const blackDuckUtils = React.useMemo(
    () => new BlackDuckUtils(),
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
            // Get the check results for each entity
            const results = await Promise.all(
                entities.map(entity =>
                    blackDuckUtils.getBlackDuckChecks(techInsightsApi, {
                        kind: entity.kind,
                        namespace: entity.metadata.namespace || 'default',
                        name: entity.metadata.name,
                    }),
                ),
            );

            // Aggregate the results
            const counts = results.reduce(
            (acc, res) => {
                acc.criticalSecurityCheckFails += res.criticalSecurityCheck === false ? 1 : 0;
                acc.highSecurityCheckFails += res.highSecurityCheck === false ? 1 : 0;
                acc.mediumSecurityCheckFails += res.mediumSecurityCheck === false ? 1 : 0;
                return acc;
            },
            { criticalSecurityCheckFails: 0, highSecurityCheckFails: 0, mediumSecurityCheckFails: 0 },
            );

            console.log('BlackDuck counts:', counts);

            // COunt the number of checks that failed for more than 1/3 of the entities
            const redCount = Object.values(counts).filter(
            v => v > entities.length / 3,
            ).length;

            // Determine the color and reason based on the counts
            if (Object.values(counts).every(v => v === 0)) {
                // All checks passed for all entities
                setColor('green');
                setReason('All BlackDuck checks passed');
            } else if (counts.criticalSecurityCheckFails > 0 || redCount >= 1) {
                // Critical security issues or at least one check failed for more than 1/3 of the entities
                setColor('red');
                setReason(`Critical security issues were detected`);
            } else {
                // Some security issues, but no critical issues and no checks failed for more than 1/3 of the entities
                setColor('yellow');
                setReason(`Some security issues detected`);
            }
        } catch (err) {
            // Handle errors gracefully
            console.error('BlackDuck error:', err);
            setColor('gray');
            setReason('Error fetching BlackDuck data');
        }
    };

    fetchData();
  }, [entities, techInsightsApi]);

  return <BaseTrafficLight color={color} tooltip={reason} onClick={onClick} />;
};
