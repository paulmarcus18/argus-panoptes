import { generateSummaries } from './createAISummary';
import { CommitsPerRepo } from './types';

describe('generateSummaries', () => {
  const mockApiBaseUrl = 'https://api.example.com';

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('generates summaries grouped by system', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Summary for repo1' }] } }],
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Summary for repo2' }] } }],
        }),
      });

    const input: Record<string, CommitsPerRepo[]> = {
      'system-a': [
        { repoName: 'repo1', commitMessages: 'Fix bug A' },
        { repoName: 'repo2', commitMessages: 'Add feature B' },
      ],
    };

    // ✅ Add all required arguments
    const result = await generateSummaries(
      input,
      mockApiBaseUrl,
      global.fetch as typeof fetch
    );

    expect(result).toEqual({
      'system-a': [
        { repoName: 'repo1', summary: 'Summary for repo1' },
        { repoName: 'repo2', summary: 'Summary for repo2' },
      ],
    });
  });

  it('falls back to default message if OpenRouter returns no content', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        candidates: [{ content: { parts: [{ text: undefined }] } }],
      }),
    });

    const input: Record<string, CommitsPerRepo[]> = {
      'system-x': [{ repoName: 'repoX', commitMessages: 'Refactor code' }],
    };

    // ✅ Add all required arguments
    const result = await generateSummaries(
      input,
      mockApiBaseUrl,
      global.fetch as typeof fetch
    );

    expect(result).toEqual({
      'system-x': [{ repoName: 'repoX', summary: 'No summary returned.' }],
    });
  });

  it('logs error and skips repo on exception', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const input: Record<string, CommitsPerRepo[]> = {
      'system-error': [{ repoName: 'repoErr', commitMessages: 'Some commit' }],
    };

    // ✅ Add all required arguments
    const result = await generateSummaries(
      input,
      mockApiBaseUrl,
      global.fetch as typeof fetch
    );

    expect(result).toEqual({ 'system-error': [] });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error summarizing repoErr in system-error:',
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});