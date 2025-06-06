import { CommitsPerRepo, SummaryPerRepo } from './types';

/**
 * Core logic: Summarize commit messages by system using OpenRouter (Gemini model).
 * Accepts a map of system names to commit message data.
 */
export async function generateSummaries(
  commitMessagesBySystem: Record<string, CommitsPerRepo[]>,
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

      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": "Bearer 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",
            "Content-Type": "application/json",
            "HTTP-Referer": "<YOUR_SITE_URL>", // Optional
            "X-Title": "<YOUR_SITE_NAME>"     // Optional
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-exp:free",
            messages: [
              {
                role: "user",
                content: [{ type: "text", text: prompt }]
              }
            ]
          })
        });

        const data = await response.json();
        const summary = data?.choices?.[0]?.message?.content ?? 'No summary returned.';
        summarizedRepos.push({ repoName, summary });

      } catch (error) {
        console.error(`Error summarizing ${repoName} in ${system}:`, error);
      }
    }

    summaries[system] = summarizedRepos;
  }

  return summaries;
}
