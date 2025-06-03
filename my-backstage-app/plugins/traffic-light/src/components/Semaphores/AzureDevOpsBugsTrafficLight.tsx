import React, { useEffect, useState } from 'react';
import { Entity } from '@backstage/catalog-model';
import { useApi } from '@backstage/core-plugin-api';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { AzureUtils } from '../../utils/azureUtils';
import { Box, Tooltip } from '@material-ui/core';

export const AzureDevOpsBugsTrafficLight = ({

  entities,
  onClick,
}: {
  entities: Entity[];
  onClick?: () => void;
}) => {
  const [color, setColor] = useState<
    'green' | 'red' | 'yellow' | 'gray' | 'white'
  >('white');
  const [reason, setReason] = useState<string>(
    'Loading Azure DevOps bug data...',
  );
  const techInsightsApi = useApi(techInsightsApiRef);

  const azureUtils = React.useMemo(
      () => new AzureUtils(),
      [techInsightsApi],
    );

  useEffect(() => {
    const fetchAzureData = async () => {
      if (!entities || entities.length === 0) {
        setColor('gray');
        setReason('No entities selected');
        return;
      }

      try {
        const azureCheckResults = await Promise.all(
          entities.map(entity =>
            azureUtils.getAzureDevOpsBugChecks(techInsightsApi, {
              kind: entity.kind,
              namespace: entity.metadata.namespace || 'default',
              name: entity.metadata.name,
            }),
          ),
        );

        const totalChecks = azureCheckResults.reduce(
          (acc, result) => {
            acc.failed += result.bugCountCheck === false ? 1 : 0;
            return acc;
          },
          { failed: 0 },
        );

        if (totalChecks.failed === 0) {
          setColor('green');
          setReason(`All Azure DevOps bug checks passed for all entities`);
        } else if (totalChecks.failed > entities.length / 3) {
          setColor('red');
          setReason(`${totalChecks.failed} entities failed the bug check`);
        } else {
          setColor('yellow');
          setReason(`${totalChecks.failed} entities failed the bug check`);
        }
      } catch (err) {
        console.error('Error fetching Azure DevOps bug data:', err);
        setColor('gray');
        setReason('Failed to retrieve Azure DevOps bug data');
      }
    };

    fetchAzureData();
  }, [entities, techInsightsApi]);

  return (
    <Tooltip title={reason}>
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
    </Tooltip>
  );
};