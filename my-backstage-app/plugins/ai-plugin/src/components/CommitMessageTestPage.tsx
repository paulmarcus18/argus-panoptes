import React, { useEffect, useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { getCommitMessagesBySystem } from '../../utils/getCommitMessagesBySystem';

export const CommitMessageTestPage = () => {
  const catalogApi = useApi(catalogApiRef);
  const techInsightsApi = useApi(techInsightsApiRef);
  const [messagesBySystem, setMessagesBySystem] = useState<Record<
    string,
    string
  > | null>(null);

  useEffect(() => {
    (async () => {
      const result = await getCommitMessagesBySystem(
        catalogApi,
        techInsightsApi,
      );
      setMessagesBySystem(result);
      console.log('📬 Aggregated messages:', result);
    })();
  }, [catalogApi, techInsightsApi]);

  return (
    <div>
      <h1>Commit Messages by System</h1>
      {messagesBySystem ? (
        Object.entries(messagesBySystem).map(([system, messages]) => (
          <div key={system}>
            <h2>{system}</h2>
            <pre>{messages}</pre>
          </div>
        ))
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};
