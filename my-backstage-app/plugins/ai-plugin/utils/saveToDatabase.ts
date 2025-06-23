import { SummaryPerRepo } from './types';

export async function postSummaries(
  data: Record<string, SummaryPerRepo[]>,
  date: string,
  apiBaseUrl: string,
  fetchFn: typeof fetch,
): Promise<void> {
  for (const [system, summaries] of Object.entries(data)) {
    const response = await fetchFn(`${apiBaseUrl}/summaries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system,
        date,
        summaries,
      }),
    });

    if (!response.ok) {
      await response.text();
    }
  }
}
