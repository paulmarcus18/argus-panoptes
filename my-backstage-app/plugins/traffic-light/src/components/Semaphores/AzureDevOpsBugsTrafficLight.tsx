import React, { useEffect, useState } from 'react';
import { BaseTrafficLight } from './BaseTrafficLight';
import { getAzureDevOpsBugs } from '../utils';

export const AzureDevOpsBugsTrafficLight = ({
  onClick,
}: {
  onClick?: () => void;
}) => {
  const [color, setColor] = useState<
    'green' | 'yellow' | 'red' | 'gray' | 'white'
  >('white');
  const [reason, setReason] = useState('Loading Azure DevOps bug data...');

  useEffect(() => {
    const fetchBugCount = async () => {
      try {
        const bugCount = await getAzureDevOpsBugs();
        if (bugCount === 0) {
          setColor('green');
          setReason('No open bugs in Azure DevOps');
        } else if (bugCount <= 5) {
          setColor('yellow');
          setReason(`Moderate number of bugs: ${bugCount}`);
        } else {
          setColor('red');
          setReason(`High number of bugs: ${bugCount}`);
        }
      } catch (err) {
        console.error('Failed to fetch Azure DevOps bugs:', err);
        setColor('gray');
        setReason('Failed to retrieve Azure DevOps bug data');
      }
    };
    fetchBugCount();
  }, []);

  return <BaseTrafficLight color={color} tooltip={reason} onClick={onClick} />;
};
