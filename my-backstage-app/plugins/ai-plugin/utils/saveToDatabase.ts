import { SummaryPerRepo } from './types';

export async function postSummaries(
  data: Record<string, SummaryPerRepo[]>,
  date: string,
  apiBaseUrl: string,
  fetchFn: typeof fetch,
): Promise<void> {
  for (const [system, summaries] of Object.entries(data)) {
    try {
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
        const errorText = await response.text();
        console.error(
          `POST Summaries failed for '${system}': ${response.status}`,
          errorText,
        );
      }
    } catch (err) {
      console.error(`POST Summaries threw error for '${system}':`, err);
    }
  }
}
