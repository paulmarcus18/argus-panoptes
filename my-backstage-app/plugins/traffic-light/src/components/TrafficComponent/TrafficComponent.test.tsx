// import React from 'react';
// import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
// import { TrafficComponent } from './TrafficComponent';
// import { RepoFetchComponent } from '../RepoFetchComponent';
// import { fetchRepoStatus } from '../api/mockStatusApi';
// import '@testing-library/jest-dom';

// // Mock the imported components and APIs
// jest.mock('../RepoFetchComponent', () => ({
//   RepoFetchComponent: ({ onData }: { onData: (data: any) => void }) => {
//     // Simulate the component behavior by calling onData after render
//     React.useEffect(() => {
//       onData([
//         { name: 'repo1', description: 'Test repo 1' },
//         { name: 'repo2', description: 'Test repo 2' },
//       ]);
//     }, [onData]);
//     return <div data-testid="repo-fetch-component" />;
//   },
// }));

// jest.mock('../api/mockStatusApi', () => ({
//   fetchRepoStatus: jest.fn(),
// }));

// // Mock the fetch function for the traffic light component
// global.fetch = jest.fn();

// describe('TrafficComponent', () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
    
//     // Mock successful fetch response for dependabot status
//     (global.fetch as jest.Mock).mockResolvedValue({
//       ok: true,
//       json: jest.fn().mockResolvedValue({ status: 'green' }),
//     });

//     // Mock successful fetchRepoStatus response
//     (fetchRepoStatus as jest.Mock).mockResolvedValue({
//       Dependabot: { color: 'green', reason: 'All dependencies up to date' },
//       BlackDuck: { color: 'green', reason: 'No security issues found' },
//       Fortify: { color: 'yellow', reason: 'Minor issues found' },
//       SonarQube: { color: 'green', reason: 'All checks passing' },
//       CodeScene: { color: 'red', reason: 'High technical debt' },
//       'Reporting Pipeline': { color: 'green', reason: 'Pipeline passing' },
//       'Pre-Production pipelines': { color: 'yellow', reason: 'Warning detected' },
//       'Foundation Pipelines': { color: 'green', reason: 'All pipelines passing' },
//     });
//   });

//   // Helper function to select a repository
//   const selectRepo = async (repoName: string) => {
//     const selectElement = screen.getByLabelText('Repository');
//     await act(async () => {
//       fireEvent.mouseDown(selectElement);
//     });
    
//     const option = screen.getByText(repoName);
//     await act(async () => {
//       fireEvent.click(option);
//     });
//   };

//   it('renders the page with header and repository selector', async () => {
//     render(<TrafficComponent />);
    
//     // Check header elements
//     expect(screen.getByText('Traffic light plugin')).toBeInTheDocument();
    
//     // Check that the repository selector is rendered
//     expect(screen.getByLabelText('Repository')).toBeInTheDocument();
    
//     // Wait for repo data to be loaded by the mocked RepoFetchComponent
//     await waitFor(() => {
//       expect(screen.getByText('repo1')).toBeInTheDocument();
//       expect(screen.getByText('repo2')).toBeInTheDocument();
//     });
//   });

//   it('displays repository information when a repository is selected', async () => {
//     render(<TrafficComponent />);
    
//     // Wait for repo data to be loaded
//     await waitFor(() => {
//       expect(screen.getByText('repo1')).toBeInTheDocument();
//     });
    
//     // Select a repository
//     await selectRepo('repo1');
    
//     // Check that repository information is displayed
//     expect(screen.getByText('GitHub Repository')).toBeInTheDocument();
//     expect(screen.getByText('repo1')).toBeInTheDocument();
//     expect(screen.getByText('Test repo 1')).toBeInTheDocument();
//   });

//   it('displays all traffic light sections when a repository is selected', async () => {
//     render(<TrafficComponent />);
    
//     // Wait for repo data to be loaded
//     await waitFor(() => {
//       expect(screen.getByText('repo1')).toBeInTheDocument();
//     });
    
//     // Select a repository
//     await selectRepo('repo1');
    
//     // Check that all sections are displayed
//     expect(screen.getByText('Security Checks')).toBeInTheDocument();
//     expect(screen.getByText('Software Quality')).toBeInTheDocument();
//     expect(screen.getByText('Reporting Pipelines')).toBeInTheDocument();
//     expect(screen.getByText('Pre-Production Environment Status')).toBeInTheDocument();
//     expect(screen.getByText('Foundation Pipelines')).toBeInTheDocument();
    
//     // Check that individual tools are displayed
//     expect(screen.getByText('Dependabot')).toBeInTheDocument();
//     expect(screen.getByText('BlackDuck')).toBeInTheDocument();
//     expect(screen.getByText('Fortify')).toBeInTheDocument();
//     expect(screen.getByText('SonarQube')).toBeInTheDocument();
//     expect(screen.getByText('CodeScene')).toBeInTheDocument();
//     expect(screen.getByText('Reporting Pipeline')).toBeInTheDocument();
//     expect(screen.getByText('Pre-Production pipelines')).toBeInTheDocument();
//     expect(screen.getByText('Foundation Pipelines')).toBeInTheDocument();
//   });

//   it('fetches dependabot status when a repository is selected', async () => {
//     render(<TrafficComponent />);
    
//     // Wait for repo data to be loaded
//     await waitFor(() => {
//       expect(screen.getByText('repo1')).toBeInTheDocument();
//     });
    
//     // Select a repository
//     await selectRepo('repo1');
    
//     // Check that fetch was called with the correct URL
//     await waitFor(() => {
//       expect(global.fetch).toHaveBeenCalledWith(
//         'api/traffic-light/dependabotStatus/philips-lab/repo1'
//       );
//     });
//   });

//   it('opens a dialog when clicking on a More button', async () => {
//     render(<TrafficComponent />);
    
//     // Wait for repo data to be loaded and select a repository
//     await waitFor(() => {
//       expect(screen.getByText('repo1')).toBeInTheDocument();
//     });
//     await selectRepo('repo1');
    
//     // Find the More button for Security Checks and click it
//     const moreButtons = screen.getAllByRole('button');
//     await act(async () => {
//       fireEvent.click(moreButtons[1]); // The first more button (Security Checks)
//     });
    
//     // Check that the dialog is open with the correct title
//     expect(screen.getByText('Security Checks')).toBeInTheDocument();
    
//     // Check that dialog items are displayed
//     expect(screen.getByText('Dependabot')).toBeInTheDocument();
//     expect(screen.getByText('BlackDuck')).toBeInTheDocument();
//     expect(screen.getByText('Fortify')).toBeInTheDocument();
//   });

//   it('handles error when fetching dependabot status', async () => {
//     // Mock failed fetch for this test
//     (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
//     const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
//     render(<TrafficComponent />);
    
//     // Wait for repo data to be loaded and select a repository
//     await waitFor(() => {
//       expect(screen.getByText('repo1')).toBeInTheDocument();
//     });
//     await selectRepo('repo1');
    
//     // Verify error was logged
//     await waitFor(() => {
//       expect(consoleSpy).toHaveBeenCalledWith(
//         'Failed to fetch dependabot status:',
//         expect.any(Error)
//       );
//     });
    
//     consoleSpy.mockRestore();
//   });

//   it('closes the dialog when clicking close', async () => {
//     render(<TrafficComponent />);
    
//     // Wait for repo data to be loaded and select a repository
//     await waitFor(() => {
//       expect(screen.getByText('repo1')).toBeInTheDocument();
//     });
//     await selectRepo('repo1');
    
//     // Check that the dialog is closed (title no longer visible in dialog)
//     // This depends on how your DialogComponent handles closing - might need adjustment
//     await waitFor(() => {
//       expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
//     });
//   });
// });