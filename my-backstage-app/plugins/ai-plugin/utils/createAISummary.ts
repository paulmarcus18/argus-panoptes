import { CommitsPerRepo, SummaryPerRepo } from './types';

export async function generateSummaries(
  commitMessagesBySystem: Record<string, CommitsPerRepo[]>,
  apiBaseUrl: string,
  fetchFn: typeof fetch,
): Promise<Record<string, SummaryPerRepo[]>> {
  const summaries: Record<string, SummaryPerRepo[]> = {};

  for (const [system, repos] of Object.entries(commitMessagesBySystem)) {
    const summarizedRepos: SummaryPerRepo[] = [];

    for (const { repoName, commitMessages } of repos) {
      const prompt = `Summarize the following git commit messages:\n\n${commitMessages}. 
        Your response MUST follow the format: 
        New functionality 
        * Functionality 1
        * Functionality 2
        Improvements
        * Improvement 1
        * Improvement 2
        Bug fixes
        * Bug fix 1
        * Bug fix 2
        Breaking changes
        * Breaking change 1
        * Breaking change 2
        Write N/A if not applicable.
        Write in a concise and clear manner.
        Write in a list format.
        You must not add empty lines.
        Only use stars for the content of each section, not the section name itself.
        Write in a professional tone. Write just the summary. You must follow the format exactly. Do not add any other information.
        Do not write the commit messages again. I want the summary only.`;
      const response = await fetchFn(`${apiBaseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      const summary =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ??
        'No summary returned.';
      summarizedRepos.push({ repoName, summary });
    }

    summaries[system] = summarizedRepos;
  }

  return summaries;
}
