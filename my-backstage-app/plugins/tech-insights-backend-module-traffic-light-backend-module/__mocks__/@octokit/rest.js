// Mock for @octokit/rest
module.exports = {
    Octokit: jest.fn(() => ({
      request: jest.fn(),
    })),
  };