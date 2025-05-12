import { GoogleGenAI } from '@google/genai';
import { CatalogApi } from '@backstage/catalog-client';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';
import { getCommitMessagesBySystem } from './getCommitMessagesBySystem';
import { CommitsPerRepo, SummaryPerRepo } from './types';

/**
 * Core logic: Summarize commit messages by system using Gemini.
 * Accepts a Gemini AI client and pre-fetched commit message data.
 */
export async function generateSummariesFromCommits(
  ai: GoogleGenAI,
  commitMessagesBySystem: Record<string, CommitsPerRepo[]>,
): Promise<Record<string, SummaryPerRepo[]>> {
  /**
   * Initializes an empty record with system as key and
   * a SummaryPerRepo list as value.
   */
  const summaries: Record<string, SummaryPerRepo[]> = {};

  /**
   * Goes through each pair of key and value objects of the
   * type system and repo list and generates a release note for
   * the repo.
   */
  for (const [system, repos] of Object.entries(commitMessagesBySystem)) {
    /**
     * Initializes an empty SummaryPerRepo list.
     */
    const summarizedRepos: SummaryPerRepo[] = [];

    /**
     * Goes throug each pair of repo name and commit messages of
     * the repo list and generates the release note.
     */
    for (const { repoName, commitMessages } of repos) {
      const prompt = `Summarize the following git commit messages:\n\n${commitMessages}.`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
        });

        const summary = response?.text ?? 'No summary returned.';
        summarizedRepos.push({ repoName, summary });
      } catch (error) {
        console.error(`Error summarizing ${repoName} in ${system}:`, error);
      }
    }

    summaries[system] = summarizedRepos;
  }

  return summaries;
}

/**
 * This is a wrapper function that uses the getCommitMessagesBySystem
 * function to get commitMessagesBySystem and that initializez a new
 * ai model using gemini. It then calls generateSummariesFromCommits
 * using the two as parameters.
 */
export async function generateSummaries(
  catalogApi: CatalogApi,
  techInsightsApi: TechInsightsApi,
): Promise<Record<string, SummaryPerRepo[]>> {
  const ai = new GoogleGenAI({
    apiKey: 'AIzaSyC7PNqPNPlfa7v4obQm70xSr_XEfG1ySwA',
  });

  const commitMessagesBySystem = await getCommitMessagesBySystem(
    catalogApi,
    techInsightsApi,
  );

  return generateSummariesFromCommits(ai, commitMessagesBySystem);
}
