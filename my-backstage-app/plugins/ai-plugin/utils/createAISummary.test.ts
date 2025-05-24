import { generateSummaries } from './createAISummary';
import { CommitsPerRepo } from './types';

describe('generateSummaries', () => {
  /**
   * Mocks the global fetch function used for API calls.
   */
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  /**
   * Checks if the summaries created are grouped by system
   * and correctly returned from mocked OpenRouter responses.
   */
  it('generates summaries grouped by system', async () => {
    /**
     * Mocks two successful AI responses for two repos.
     */
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({
          choices: [{ message: { content: 'Summary for repo1' } }],
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          choices: [{ message: { content: 'Summary for repo2' } }],
        }),
      });

    /**
     * Mocks an input for the generateSummaries function.
     */
    const input: Record<string, CommitsPerRepo[]> = {
      'system-a': [
        { repoName: 'repo1', commitMessages: 'Fix bug A' },
        { repoName: 'repo2', commitMessages: 'Add feature B' },
      ],
    };

    /**
     * Gets the response of the generateSummaries function on the mock input.
     */
    const result = await generateSummaries(input);

    /**
     * Checks to see if the results the function is providing are as expected.
     */
    expect(result).toEqual({
      'system-a': [
        { repoName: 'repo1', summary: 'Summary for repo1' },
        { repoName: 'repo2', summary: 'Summary for repo2' },
      ],
    });
  });

  /**
   * Checks if the generateSummaries function falls
   * back to the default message in case OpenRouter gives no usable response.
   */
  it('falls back to default message if OpenRouter returns no content', async () => {
    /**
     * Mocks a response where content is undefined.
     */
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        choices: [{ message: { content: undefined } }],
      }),
    });

    /**
     * Mocks an input for the generateSummaries function.
     */
    const input: Record<string, CommitsPerRepo[]> = {
      'system-x': [{ repoName: 'repoX', commitMessages: 'Refactor code' }],
    };

    /**
     * Gets the response of the generateSummaries function on the mock input.
     */
    const result = await generateSummaries(input);

    /**
     * Checks to see if the fallback message is used correctly.
     */
    expect(result).toEqual({
      'system-x': [{ repoName: 'repoX', summary: 'No summary returned.' }],
    });
  });

  /**
   * Checks if the generateSummaries function logs error
   * and skips repos when an exception occurs (e.g., network failure).
   */
  it('logs error and skips repo on exception', async () => {
    /**
     * Mocks the console.error function to track error logging.
     */
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    /**
     * Mocks a rejected fetch to simulate network/API failure.
     */
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    /**
     * Mocks an input for the generateSummaries function.
     */
    const input: Record<string, CommitsPerRepo[]> = {
      'system-error': [{ repoName: 'repoErr', commitMessages: 'Some commit' }],
    };

    /**
     * Gets the response of the generateSummaries function on the mock input.
     */
    const result = await generateSummaries(input);

    /**
     * Checks to see that the failed repo is skipped.
     */
    expect(result).toEqual({ 'system-error': [] });

    /**
     * Ensures error is logged with the expected message.
     */
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error summarizing repoErr in system-error:',
      expect.any(Error),
    );

    /**
     * Restores the original console.error function.
     */
    consoleErrorSpy.mockRestore();
  });
});
