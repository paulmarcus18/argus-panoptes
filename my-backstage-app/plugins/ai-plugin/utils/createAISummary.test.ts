import { generateSummaries } from './createAISummary';
import { CommitsPerRepo } from './types';

describe('generateSummaries', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  /**
   * Sets up mocks before each test.
   */
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
  });

  /**
   * Checks if the summaries created are grouped by system
   * and correctly returned from mocked AI responses.
   */
  it('generates summaries grouped by system', async () => {
    /**
     * Mocks two successful AI responses for two repos.
     * Updated to match the actual API response structure that the implementation expects.
     */
    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Summary for repo1' }],
              },
            },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Summary for repo2' }],
              },
            },
          ],
        }),
      } as Response);

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
     * Updated to pass all required parameters: commitMessagesBySystem, apiBaseUrl, and fetchFn.
     */
    const result = await generateSummaries(input, 'http://test-api', mockFetch);

    /**
     * Checks to see if the results the function is providing are as expected.
     */
    expect(result).toEqual({
      'system-a': [
        { repoName: 'repo1', summary: 'Summary for repo1' },
        { repoName: 'repo2', summary: 'Summary for repo2' },
      ],
    });

    /**
     * Verifies that fetch was called with correct parameters.
     */
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenCalledWith('http://test-api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: expect.stringContaining('Fix bug A'),
    });
  });

  /**
   * Checks if the generateSummaries function falls
   * back to the default message in case the AI API gives no usable response.
   */
  it('falls back to default message if API returns no content', async () => {
    /**
     * Mocks a response where content is undefined.
     * Updated to match the actual API response structure.
     */
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: undefined }],
            },
          },
        ],
      }),
    } as Response);

    /**
     * Mocks an input for the generateSummaries function.
     */
    const input: Record<string, CommitsPerRepo[]> = {
      'system-x': [{ repoName: 'repoX', commitMessages: 'Refactor code' }],
    };

    /**
     * Gets the response of the generateSummaries function on the mock input.
     */
    const result = await generateSummaries(input, 'http://test-api', mockFetch);

    /**
     * Checks to see if the fallback message is used correctly.
     */
    expect(result).toEqual({
      'system-x': [{ repoName: 'repoX', summary: 'No summary returned.' }],
    });
  });

  /**
   * Checks if the generateSummaries function falls back when API returns empty response.
   */
  it('falls back to default message if API returns empty candidates', async () => {
    /**
     * Mocks a response with empty candidates array.
     */
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        candidates: [],
      }),
    } as Response);

    const input: Record<string, CommitsPerRepo[]> = {
      'system-y': [
        { repoName: 'repoY', commitMessages: 'Update dependencies' },
      ],
    };

    const result = await generateSummaries(input, 'http://test-api', mockFetch);

    expect(result).toEqual({
      'system-y': [{ repoName: 'repoY', summary: 'No summary returned.' }],
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
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    /**
     * Mocks a rejected fetch to simulate network/API failure.
     */
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    /**
     * Mocks an input for the generateSummaries function.
     */
    const input: Record<string, CommitsPerRepo[]> = {
      'system-error': [{ repoName: 'repoErr', commitMessages: 'Some commit' }],
    };

    /**
     * Gets the response of the generateSummaries function on the mock input.
     */
    const result = await generateSummaries(input, 'http://test-api', mockFetch);

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

  /**
   * Checks if the function handles multiple systems correctly.
   */
  it('handles multiple systems with mixed success and failure', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    /**
     * Mock successful response for first repo, failed for second.
     */
    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Success summary' }],
              },
            },
          ],
        }),
      } as Response)
      .mockRejectedValueOnce(new Error('API failure'));

    const input: Record<string, CommitsPerRepo[]> = {
      'system-success': [
        { repoName: 'repo-success', commitMessages: 'Working changes' },
      ],
      'system-fail': [
        { repoName: 'repo-fail', commitMessages: 'Broken changes' },
      ],
    };

    const result = await generateSummaries(input, 'http://test-api', mockFetch);

    expect(result).toEqual({
      'system-success': [
        { repoName: 'repo-success', summary: 'Success summary' },
      ],
      'system-fail': [],
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error summarizing repo-fail in system-fail:',
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
