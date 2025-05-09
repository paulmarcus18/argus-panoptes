import { GoogleGenAI } from '@google/genai'; // Import the GoogleGenAI package
import { getCommitMessagesBySystem } from './getCommitMessagesBySystem'; // Import the function to get commit messages
import { CatalogApi } from '@backstage/plugin-catalog-react';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';

// Initialize GoogleGenAI with your API key
const ai = new GoogleGenAI({ apiKey: 'AIzaSyC7PNqPNPlfa7v4obQm70xSr_XEfG1ySwA' });

interface CommitsPerRepo {
    repoName: string;
    commitMessages: string;
}

interface SummaryPerRepo {
    repoName: string;
    summary: string;
}
  
export const generateSummaries = async (
    catalogApi: CatalogApi,
    techInsightsApi: TechInsightsApi,
  ): Promise<Record<string, SummaryPerRepo[]>> => {
    const summaries: Record<string, SummaryPerRepo[]> = {};
    const data = await getCommitMessagesBySystem(catalogApi, techInsightsApi);
    // const data: Record<string, CommitsPerRepo[]> = {
    //     'payments': [
    //       {
    //         repoName: 'payments-service',
    //         commitMessages:
    //           'refactor: improved validation\nfix: handle declined payments\nfeat: added transaction logging',
    //       },
    //       {
    //         repoName: 'billing-ui',
    //         commitMessages:
    //           'fix: dropdown bug\nstyle: invoice layout\nchore: tooltip help text',
    //       },
    //     ],
    //     'user-management': [
    //       {
    //         repoName: 'auth-service',
    //         commitMessages:
    //           'fix: token refresh\nfeat: add 2FA\nrefactor: session handling',
    //       },
    //     ],
    //   };
    

    for (const [system, repos] of Object.entries(data)) {
        const summarizedRepos: SummaryPerRepo[] = [];
        for (const { repoName, commitMessages } of repos) {
            const prompt = `Summarize the following git commit messages:\n\n${commitMessages}.`;
            try {
                const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
                });

                const summary = response.text ?? 'No summary returned.';
                const summarizedRepo: SummaryPerRepo = {repoName: repoName, summary: summary};
                summarizedRepos.push(summarizedRepo);
            } catch (error) {
                console.error(`Error summarizing ${repoName} in ${system}:`, error);
            }

        }
        summaries[system] = summarizedRepos;
    }
    return summaries;
  };
  