import React, { useEffect, useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { getCommitMessagesBySystem } from '../../utils/getCommitMessagesBySystem';
import { generateSummaries } from '../../utils/createAISummary';

interface SummaryPerRepo {
  repoName: string;
  summary: string;
}

export const CommitMessageTestPage = () => {
  const catalogApi = useApi(catalogApiRef);
  const techInsightsApi = useApi(techInsightsApiRef);
  const [messagesBySystem, setMessagesBySystem] = useState<Record<
    string,
    SummaryPerRepo[]
  > | null>(null);

  useEffect(() => {
    (async () => {
      const result = await generateSummaries(
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
            <ul>
              {messages.map(({ repoName, summary }) => (
                <li key={repoName}>
                  <strong>{repoName}</strong>
                  <pre>{summary}</pre>
                </li>
              ))}
            </ul>
          </div>
        ))
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
  
};
