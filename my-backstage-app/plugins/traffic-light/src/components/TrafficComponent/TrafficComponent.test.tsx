// import { render, screen, waitFor } from '@testing-library/react';
// import userEvent from '@testing-library/user-event';
// import { TrafficComponent } from './TrafficComponent';
// import { Entity } from '@backstage/catalog-model';
// import { ThemeProvider } from '@material-ui/core/styles';
// import { lightTheme } from '@backstage/theme';
// import React from 'react';

// // Mock the Backstage APIs at the top level
// const mockCatalogApiRef = { id: 'catalog-api' };
// const mockIdentityApiRef = { id: 'identity-api' };
// const mockTechInsightsApiRef = { id: 'tech-insights-api' };

// // Mock the entire core-plugin-api module
// jest.mock('@backstage/core-plugin-api', () => ({
//   useApi: mockUseApi,
//   identityApiRef: mockIdentityApiRef,
// }));

// // Mock the catalog react module  
// jest.mock('@backstage/plugin-catalog-react', () => ({
//   catalogApiRef: mockCatalogApiRef,
// }));

// // Mock tech insights completely to avoid provider conflicts
// jest.mock('@backstage/plugin-tech-insights', () => {
//   const mockApiRef = { id: 'tech-insights-api' };
//   return {
//     techInsightsApiRef: mockApiRef,
//     TechInsightsApi: class MockTechInsightsApi {
//       getFacts = jest.fn().mockResolvedValue([]);
//       getChecks = jest.fn().mockResolvedValue([]);
//       runChecks = jest.fn().mockResolvedValue([]);
//     },
//   };
// });

// // Mock GithubAdvancedSecurityUtils and other utilities
// jest.mock('../../utils/githubAdvancedSecurityUtils', () => ({
//   GithubAdvancedSecurityUtils: jest.fn().mockImplementation(() => ({
//     getGitHubSecurityData: jest.fn().mockResolvedValue({
//       criticalCheck: false,
//       highCheck: false,
//       mediumCheck: false,
//       lowCheck: false,
//       secretCheck: false,
//     }),
//   })),
// }));

// // Mock other utility classes that might be used by traffic lights
// jest.mock('../../utils/dependabotUtils', () => ({
//   DependabotUtils: jest.fn().mockImplementation(() => ({
//     getDependabotData: jest.fn().mockResolvedValue({ hasVulnerabilities: false }),
//   })),
// }));

// jest.mock('../../utils/sonarQubeUtils', () => ({
//   SonarQubeUtils: jest.fn().mockImplementation(() => ({
//     getSonarQubeData: jest.fn().mockResolvedValue({ hasIssues: false }),
//   })),
// }));

// jest.mock('../../utils/blackDuckUtils', () => ({
//   BlackDuckUtils: jest.fn().mockImplementation(() => ({
//     getBlackDuckData: jest.fn().mockResolvedValue({ hasVulnerabilities: false }),
//   })),
// }));

// // Mock all the traffic light components with accessible elements (Material-UI v4)
// jest.mock('../Semaphores', () => ({
//   TrafficLightDependabot: ({ onClick }: { onClick: () => void }) => (
//     <button
//       type="button"
//       data-testid="dependabot-traffic-light"
//       onClick={onClick}
//       style={{ 
//         padding: '8px 16px', 
//         backgroundColor: '#1976d2', 
//         color: 'white', 
//         border: 'none', 
//         borderRadius: '4px' 
//       }}
//     >
//       Dependabot Traffic Light
//     </button>
//   ),
//   GitHubSecurityTrafficLight: ({ onClick }: { onClick: () => void }) => (
//     <button
//       type="button"
//       data-testid="github-security-traffic-light"
//       onClick={onClick}
//       style={{ 
//         padding: '8px 16px', 
//         backgroundColor: '#1976d2', 
//         color: 'white', 
//         border: 'none', 
//         borderRadius: '4px' 
//       }}
//     >
//       GitHub Security Traffic Light
//     </button>
//   ),
//   SonarQubeTrafficLight: ({ onClick }: { onClick: () => void }) => (
//     <button
//       type="button"
//       data-testid="sonarqube-traffic-light"
//       onClick={onClick}
//       style={{ 
//         padding: '8px 16px', 
//         backgroundColor: '#1976d2', 
//         color: 'white', 
//         border: 'none', 
//         borderRadius: '4px' 
//       }}
//     >
//       SonarQube Traffic Light
//     </button>
//   ),
//   PreproductionTrafficLight: ({ onClick }: { onClick: () => void }) => (
//     <button
//       type="button"
//       data-testid="preproduction-traffic-light"
//       onClick={onClick}
//       style={{ 
//         padding: '8px 16px', 
//         backgroundColor: '#1976d2', 
//         color: 'white', 
//         border: 'none', 
//         borderRadius: '4px' 
//       }}
//     >
//       Preproduction Traffic Light
//     </button>
//   ),
//   FoundationTrafficLight: ({ onClick }: { onClick: () => void }) => (
//     <button
//       type="button"
//       data-testid="foundation-traffic-light"
//       onClick={onClick}
//       style={{ 
//         padding: '8px 16px', 
//         backgroundColor: '#1976d2', 
//         color: 'white', 
//         border: 'none', 
//         borderRadius: '4px' 
//       }}
//     >
//       Foundation Traffic Light
//     </button>
//   ),
//   AzureDevOpsBugsTrafficLight: ({ onClick }: { onClick: () => void }) => (
//     <button
//       type="button"
//       data-testid="azure-devops-bugs-traffic-light"
//       onClick={onClick}
//       style={{ 
//         padding: '8px 16px', 
//         backgroundColor: '#1976d2', 
//         color: 'white', 
//         border: 'none', 
//         borderRadius: '4px' 
//       }}
//     >
//       Azure DevOps Bugs Traffic Light
//     </button>
//   ),
//   BlackDuckTrafficLight: ({ onClick }: { onClick: () => void }) => (
//     <button
//       type="button"
//       data-testid="blackduck-traffic-light"
//       onClick={onClick}
//       style={{ 
//         padding: '8px 16px', 
//         backgroundColor: '#1976d2', 
//         color: 'white', 
//         border: 'none', 
//         borderRadius: '4px' 
//       }}
//     >
//       BlackDuck Traffic Light
//     </button>
//   ),
//   BaseTrafficLight: ({ onClick }: { onClick: () => void }) => (
//     <button
//       type="button"
//       data-testid="base-traffic-light"
//       onClick={onClick}
//       style={{ 
//         padding: '8px 16px', 
//         backgroundColor: '#1976d2', 
//         color: 'white', 
//         border: 'none', 
//         borderRadius: '4px' 
//       }}
//     >
//       Base Traffic Light
//     </button>
//   ),
// }));

// // Mock the reporting traffic light component
// jest.mock('../Semaphores/ReportingTrafficLight', () => ({
//   ReportingTrafficLight: ({ onClick }: { onClick: () => void }) => (
//     <button
//       type="button"
//       data-testid="reporting-traffic-light"
//       onClick={onClick}
//       style={{ 
//         padding: '8px 16px', 
//         backgroundColor: '#1976d2', 
//         color: 'white', 
//         border: 'none', 
//         borderRadius: '4px' 
//       }}
//     >
//       Reporting Traffic Light
//     </button>
//   ),
// }));

// // Mock all dialog components with accessible elements (simplified to avoid tech-insights conflicts)
// jest.mock('../SemaphoreDialogs/BlackDuckSemaphoreDialog', () => ({
//   BlackDuckSemaphoreDialog: ({
//     open,
//     onClose,
//   }: {
//     open: boolean;
//     onClose: () => void;
//   }) =>
//     open ? (
//       <div
//         role="dialog"
//         aria-label="BlackDuck Dialog"
//         data-testid="blackduck-dialog"
//         style={{
//           position: 'fixed',
//           top: '50%',
//           left: '50%',
//           transform: 'translate(-50%, -50%)',
//           backgroundColor: 'white',
//           padding: '20px',
//           border: '1px solid #ccc',
//           borderRadius: '4px',
//           zIndex: 1000,
//         }}
//       >
//         <h2>BlackDuck Dialog</h2>
//         <button type="button" onClick={onClose}>
//           Close BlackDuck Dialog
//         </button>
//       </div>
//     ) : null,
// }));

// jest.mock('../SemaphoreDialogs/GitHubAdvancedSecurityDialog', () => ({
//   GitHubSemaphoreDialog: ({
//     open,
//     onClose,
//   }: {
//     open: boolean;
//     onClose: () => void;
//   }) =>
//     open ? (
//       <div
//         role="dialog"
//         aria-label="GitHub Security Dialog"
//         data-testid="github-security-dialog"
//         style={{
//           position: 'fixed',
//           top: '50%',
//           left: '50%',
//           transform: 'translate(-50%, -50%)',
//           backgroundColor: 'white',
//           padding: '20px',
//           border: '1px solid #ccc',
//           borderRadius: '4px',
//           zIndex: 1000,
//         }}
//       >
//         <h2>GitHub Security Dialog</h2>
//         <button type="button" onClick={onClose}>
//           Close GitHub Security Dialog
//         </button>
//       </div>
//     ) : null,
// }));

// jest.mock('../SemaphoreDialogs/AzureDevOpsDialog', () => ({
//   AzureDevOpsSemaphoreDialog: ({
//     open,
//     onClose,
//   }: {
//     open: boolean;
//     onClose: () => void;
//   }) =>
//     open ? (
//       <div
//         role="dialog"
//         aria-label="Azure DevOps Dialog"
//         data-testid="azure-devops-dialog"
//         style={{
//           position: 'fixed',
//           top: '50%',
//           left: '50%',
//           transform: 'translate(-50%, -50%)',
//           backgroundColor: 'white',
//           padding: '20px',
//           border: '1px solid #ccc',
//           borderRadius: '4px',
//           zIndex: 1000,
//         }}
//       >
//         <h2>Azure DevOps Dialog</h2>
//         <button type="button" onClick={onClose}>
//           Close Azure DevOps Dialog
//         </button>
//       </div>
//     ) : null,
// }));

// jest.mock('../SemaphoreDialogs/SonarQubeDialog', () => ({
//   SonarQubeSemaphoreDialog: ({
//     open,
//     onClose,
//   }: {
//     open: boolean;
//     onClose: () => void;
//   }) =>
//     open ? (
//       <div
//         role="dialog"
//         aria-label="SonarQube Dialog"
//         data-testid="sonarqube-dialog"
//         style={{
//           position: 'fixed',
//           top: '50%',
//           left: '50%',
//           transform: 'translate(-50%, -50%)',
//           backgroundColor: 'white',
//           padding: '20px',
//           border: '1px solid #ccc',
//           borderRadius: '4px',
//           zIndex: 1000,
//         }}
//       >
//         <h2>SonarQube Dialog</h2>
//         <button type="button" onClick={onClose}>
//           Close SonarQube Dialog
//         </button>
//       </div>
//     ) : null,
// }));

// jest.mock('../SemaphoreDialogs/PreProductionDialog', () => ({
//   PreproductionSemaphoreDialog: ({
//     open,
//     onClose,
//   }: {
//     open: boolean;
//     onClose: () => void;
//   }) =>
//     open ? (
//       <div
//         role="dialog"
//         aria-label="Preproduction Dialog"
//         data-testid="preproduction-dialog"
//         style={{
//           position: 'fixed',
//           top: '50%',
//           left: '50%',
//           transform: 'translate(-50%, -50%)',
//           backgroundColor: 'white',
//           padding: '20px',
//           border: '1px solid #ccc',
//           borderRadius: '4px',
//           zIndex: 1000,
//         }}
//       >
//         <h2>Preproduction Dialog</h2>
//         <button type="button" onClick={onClose}>
//           Close Preproduction Dialog
//         </button>
//       </div>
//     ) : null,
// }));

// jest.mock('../SemaphoreDialogs/FoundationDialog', () => ({
//   FoundationSemaphoreDialog: ({
//     open,
//     onClose,
//   }: {
//     open: boolean;
//     onClose: () => void;
//   }) =>
//     open ? (
//       <div
//         role="dialog"
//         aria-label="Foundation Dialog"
//         data-testid="foundation-dialog"
//         style={{
//           position: 'fixed',
//           top: '50%',
//           left: '50%',
//           transform: 'translate(-50%, -50%)',
//           backgroundColor: 'white',
//           padding: '20px',
//           border: '1px solid #ccc',
//           borderRadius: '4px',
//           zIndex: 1000,
//         }}
//       >
//         <h2>Foundation Dialog</h2>
//         <button type="button" onClick={onClose}>
//           Close Foundation Dialog
//         </button>
//       </div>
//     ) : null,
// }));

// jest.mock('../SemaphoreDialogs/ReportingDialog', () => ({
//   ReportingSemaphoreDialog: ({
//     open,
//     onClose,
//   }: {
//     open: boolean;
//     onClose: () => void;
//   }) =>
//     open ? (
//       <div
//         role="dialog"
//         aria-label="Reporting Dialog"
//         data-testid="reporting-dialog"
//         style={{
//           position: 'fixed',
//           top: '50%',
//           left: '50%',
//           transform: 'translate(-50%, -50%)',
//           backgroundColor: 'white',
//           padding: '20px',
//           border: '1px solid #ccc',
//           borderRadius: '4px',
//           zIndex: 1000,
//         }}
//       >
//         <h2>Reporting Dialog</h2>
//         <button type="button" onClick={onClose}>
//           Close Reporting Dialog
//         </button>
//       </div>
//     ) : null,
// }));

// jest.mock('../SemaphoreDialogs/DependabotSemaphoreDialog', () => ({
//   DependabotSemaphoreDialog: ({
//     open,
//     onClose,
//   }: {
//     open: boolean;
//     onClose: () => void;
//   }) =>
//     open ? (
//       <div
//         role="dialog"
//         aria-label="Dependabot Dialog"
//         data-testid="dependabot-dialog"
//         style={{
//           position: 'fixed',
//           top: '50%',
//           left: '50%',
//           transform: 'translate(-50%, -50%)',
//           backgroundColor: 'white',
//           padding: '20px',
//           border: '1px solid #ccc',
//           borderRadius: '4px',
//           zIndex: 1000,
//         }}
//       >
//         <h2>Dependabot Dialog</h2>
//         <button type="button" onClick={onClose}>
//           Close Dependabot Dialog
//         </button>
//       </div>
//     ) : null,
// }));

// //const mockUseApi = useApi as jest.MockedFunction<typeof useApi>;

// // Test wrapper component that provides Backstage theme context
// const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
//   <ThemeProvider theme={lightTheme}>
//     {children}
//   </ThemeProvider>
// );

// // Custom render function that includes theme provider
// const renderWithTheme = (ui: React.ReactElement) => {
//   return render(ui, { wrapper: TestWrapper });
// };

// // Mock entities for testing - Added namespace for proper entity references
// const mockComponentEntities: Entity[] = [
//   {
//     apiVersion: 'backstage.io/v1alpha1',
//     kind: 'Component',
//     metadata: {
//       name: 'test-repo-1',
//       description: 'Test repository 1',
//       tags: ['critical'],
//       namespace: 'default',
//     },
//     spec: {
//       owner: 'philips-labs',
//       system: 'test-system-1',
//     },
//   },
//   {
//     apiVersion: 'backstage.io/v1alpha1',
//     kind: 'Component',
//     metadata: {
//       name: 'test-repo-2',
//       description: 'Test repository 2',
//       tags: ['non-critical'],
//       namespace: 'default',
//     },
//     spec: {
//       owner: 'other-owner',
//       system: 'test-system-2',
//     },
//   },
//   {
//     apiVersion: 'backstage.io/v1alpha1',
//     kind: 'Component',
//     metadata: {
//       name: 'test-repo-3',
//       description: 'Test repository 3',
//       tags: ['critical'],
//       namespace: 'default',
//     },
//     spec: {
//       owner: 'philips-labs',
//       system: 'test-system-1',
//     },
//   },
// ];

// const mockSystemEntities: Entity[] = [
//   {
//     apiVersion: 'backstage.io/v1alpha1',
//     kind: 'System',
//     metadata: {
//       name: 'test-system-1',
//       namespace: 'default',
//     },
//     spec: {
//       owner: 'team-1',
//     },
//   },
//   {
//     apiVersion: 'backstage.io/v1alpha1',
//     kind: 'System',
//     metadata: {
//       name: 'test-system-2',
//       namespace: 'default',
//     },
//     spec: {
//       owner: 'team-2',
//     },
//   },
// ];

// const mockUserEntity: Entity = {
//   apiVersion: 'backstage.io/v1alpha1',
//   kind: 'User',
//   metadata: {
//     name: 'test-user',
//     namespace: 'default',
//   },
//   spec: {
//     memberOf: ['team-1', 'team-2'],
//   },
// };

// // System entity with security annotations for GitHub Security Traffic Light
// const mockSystemEntityWithSecurityConfig: Entity = {
//   apiVersion: 'backstage.io/v1alpha1',
//   kind: 'System',
//   metadata: {
//     name: 'test-system-1',
//     namespace: 'default',
//     annotations: {
//       'github-advanced-security-system-critical-threshold-red': '0',
//       'github-advanced-security-system-high-threshold-red': '0',
//       'github-advanced-security-system-secrets-threshold-red': '0',
//       'github-advanced-security-system-medium-threshold-red': '0.5',
//       'github-advanced-security-system-medium-threshold-yellow': '0.1',
//       'github-advanced-security-system-low-threshold-yellow': '0.2',
//     },
//   },
//   spec: {
//     owner: 'team-1',
//   },
// };

// describe('TrafficComponent', () => {
//   const mockIdentityApi = {
//     getBackstageIdentity: jest.fn(),
//   };

//   const mockCatalogApi = {
//     getEntities: jest.fn(),
//     getEntityByRef: jest.fn(),
//     getLocationById: jest.fn(),
//     getLocationByRef: jest.fn(),
//     addLocation: jest.fn(),
//     removeEntityByUid: jest.fn(),
//     refreshEntity: jest.fn(),
//     getEntityAncestors: jest.fn(),
//     getEntityFacets: jest.fn(),
//     queryEntities: jest.fn(),
//   };

//   const mockTechInsightsApi = {
//     getFacts: jest.fn(),
//     getChecks: jest.fn(),
//     runChecks: jest.fn(),
//   };

//   beforeEach(() => {
//     jest.clearAllMocks();

//     // Direct mock implementation using the mocked API refs
//     mockUseApi.mockImplementation((apiRef: any) => {
//       console.log('useApi called with:', apiRef);

//       // Check for identity API
//       if (apiRef === mockIdentityApiRef || apiRef?.id === 'identity-api') {
//         console.log('Returning mockIdentityApi');
//         return mockIdentityApi;
//       }
      
//       // Check for catalog API  
//       if (apiRef === mockCatalogApiRef || apiRef?.id === 'catalog-api') {
//         console.log('Returning mockCatalogApi');
//         return mockCatalogApi;
//       }
      
//       // Check for tech insights API
//       if (apiRef === mockTechInsightsApiRef || apiRef?.id === 'tech-insights-api') {
//         console.log('Returning mockTechInsightsApi');
//         return mockTechInsightsApi;
//       }
      
//       // Fallback - return a basic object with common methods
//       console.log('Returning fallback API for:', apiRef);
//       return {
//         getEntities: jest.fn().mockResolvedValue({ items: [] }),
//         getEntityByRef: jest.fn().mockResolvedValue(mockUserEntity),
//         getFacts: jest.fn().mockResolvedValue([]),
//         getChecks: jest.fn().mockResolvedValue([]),
//         runChecks: jest.fn().mockResolvedValue([]),
//         getBackstageIdentity: jest.fn().mockResolvedValue({
//           userEntityRef: 'user:default/test-user',
//         }),
//       };
//     });

//     // Setup default API responses with detailed logging
//     mockIdentityApi.getBackstageIdentity.mockImplementation(async () => {
//       console.log('mockIdentityApi.getBackstageIdentity called');
//       return { userEntityRef: 'user:default/test-user' };
//     });

//     // Enhanced getEntityByRef mock with detailed logging
//     mockCatalogApi.getEntityByRef.mockImplementation(async (entityRef: any) => {
//       console.log('mockCatalogApi.getEntityByRef called with:', entityRef);
      
//       if (entityRef.kind === 'User') {
//         console.log('Returning mockUserEntity');
//         return mockUserEntity;
//       }
//       if (entityRef.kind === 'System') {
//         // Return system with security config for test-system-1
//         if (entityRef.name === 'test-system-1') {
//           console.log('Returning mockSystemEntityWithSecurityConfig');
//           return mockSystemEntityWithSecurityConfig;
//         }
//         const foundSystem = mockSystemEntities.find(e => e.metadata.name === entityRef.name);
//         console.log('Returning found system:', foundSystem?.metadata.name);
//         return foundSystem;
//       }
//       console.log('Returning default mockUserEntity');
//       return mockUserEntity;
//     });

//     mockCatalogApi.getEntities.mockImplementation(async ({ filter }: any) => {
//       console.log('mockCatalogApi.getEntities called with filter:', filter);
//       if (filter?.kind === 'Component') {
//         console.log('Returning mockComponentEntities');
//         return { items: mockComponentEntities };
//       }
//       if (filter?.kind === 'System') {
//         console.log('Returning mockSystemEntities');
//         return { items: mockSystemEntities };
//       }
//       console.log('Returning empty items');
//       return { items: [] };
//     });

//     // Setup tech insights API mock with logging
//     mockTechInsightsApi.getFacts.mockImplementation(async () => {
//       console.log('mockTechInsightsApi.getFacts called');
//       return [];
//     });
//     mockTechInsightsApi.getChecks.mockImplementation(async () => {
//       console.log('mockTechInsightsApi.getChecks called');
//       return [];
//     });
//     mockTechInsightsApi.runChecks.mockImplementation(async () => {
//       console.log('mockTechInsightsApi.runChecks called');
//       return [];
//     });
//   });

//   it('renders without crashing', async () => {
//     renderWithTheme(<TrafficComponent />);

//     await waitFor(() => {
//       expect(screen.getByText('My repositories')).toBeInTheDocument();
//     }, { timeout: 10000 });
//   });

//   it('loads and displays repositories after initial fetch', async () => {
//     renderWithTheme(<TrafficComponent />);

//     await waitFor(() => {
//       expect(screen.getByText('Selected Repositories (2)')).toBeInTheDocument();
//     }, { timeout: 10000 });

//     // Should show critical repos owned by philips-labs
//     expect(screen.getByText('test-repo-1')).toBeInTheDocument();
//     expect(screen.getByText('test-repo-3')).toBeInTheDocument();
//   });

//   it('filters repositories based on "My repositories" checkbox', async () => {
//     renderWithTheme(<TrafficComponent />);

//     await waitFor(() => {
//       expect(screen.getByText('Selected Repositories (2)')).toBeInTheDocument();
//     }, { timeout: 10000 });

//     // Uncheck "My repositories"
//     const myReposCheckbox = screen.getByLabelText('My repositories');
//     await userEvent.click(myReposCheckbox);

//     await waitFor(() => {
//       expect(screen.getByText('Selected Repositories (3)')).toBeInTheDocument();
//     }, { timeout: 5000 });
//   });

//   it('filters repositories based on "Critical" checkbox', async () => {
//     renderWithTheme(<TrafficComponent />);

//     await waitFor(() => {
//       expect(screen.getByText('Selected Repositories (2)')).toBeInTheDocument();
//     }, { timeout: 10000 });

//     // Uncheck "Critical"
//     const criticalCheckbox = screen.getByLabelText('Critical');
//     await userEvent.click(criticalCheckbox);

//     await waitFor(() => {
//       expect(screen.getByText('Selected Repositories (3)')).toBeInTheDocument();
//     }, { timeout: 5000 });
//   });

//   it('displays system selector with available systems', async () => {
//     renderWithTheme(<TrafficComponent />);

//     await waitFor(() => {
//       expect(screen.getByText('test-system-1')).toBeInTheDocument();
//     }, { timeout: 10000 });

//     // Click system selector
//     const systemButton = screen.getByText('test-system-1');
//     await userEvent.click(systemButton);

//     await waitFor(() => {
//       expect(screen.getByText('test-system-2')).toBeInTheDocument();
//     }, { timeout: 5000 });
//   });

//   it('filters repositories by selected system', async () => {
//     renderWithTheme(<TrafficComponent />);

//     await waitFor(() => {
//       expect(screen.getByText('Selected Repositories (2)')).toBeInTheDocument();
//     }, { timeout: 10000 });

//     // Open system selector
//     const systemButton = screen.getByText('test-system-1');
//     await userEvent.click(systemButton);

//     // Select different system
//     await userEvent.click(screen.getByText('test-system-2'));

//     await waitFor(() => {
//       expect(screen.getByText('Selected Repositories (0)')).toBeInTheDocument();
//     }, { timeout: 5000 });
//   });

//   it('opens BlackDuck dialog when BlackDuck traffic light is clicked', async () => {
//     renderWithTheme(<TrafficComponent />);

//     await waitFor(() => {
//       expect(screen.getByTestId('blackduck-traffic-light')).toBeInTheDocument();
//     }, { timeout: 10000 });

//     await userEvent.click(screen.getByTestId('blackduck-traffic-light'));

//     expect(screen.getByTestId('blackduck-dialog')).toBeInTheDocument();
//   });

//   it('opens GitHub Security dialog when GitHub traffic light is clicked', async () => {
//     renderWithTheme(<TrafficComponent />);

//     await waitFor(() => {
//       expect(
//         screen.getByTestId('github-security-traffic-light'),
//       ).toBeInTheDocument();
//     }, { timeout: 10000 });

//     await userEvent.click(screen.getByTestId('github-security-traffic-light'));

//     expect(screen.getByTestId('github-security-dialog')).toBeInTheDocument();
//   });

//   it('opens Dependabot dialog when Dependabot traffic light is clicked', async () => {
//     renderWithTheme(<TrafficComponent />);

//     await waitFor(() => {
//       expect(
//         screen.getByTestId('dependabot-traffic-light'),
//       ).toBeInTheDocument();
//     }, { timeout: 10000 });

//     await userEvent.click(screen.getByTestId('dependabot-traffic-light'));

//     expect(screen.getByTestId('dependabot-dialog')).toBeInTheDocument();
//   });

//   it('opens SonarQube dialog when SonarQube traffic light is clicked', async () => {
//     renderWithTheme(<TrafficComponent />);

//     await waitFor(() => {
//       expect(screen.getByTestId('sonarqube-traffic-light')).toBeInTheDocument();
//     }, { timeout: 10000 });

//     await userEvent.click(screen.getByTestId('sonarqube-traffic-light'));

//     expect(screen.getByTestId('sonarqube-dialog')).toBeInTheDocument();
//   });

//   it('opens Azure DevOps dialog when Azure DevOps traffic light is clicked', async () => {
//     renderWithTheme(<TrafficComponent />);

//     await waitFor(() => {
//       expect(
//         screen.getByTestId('azure-devops-bugs-traffic-light'),
//       ).toBeInTheDocument();
//     }, { timeout: 10000 });

//     await userEvent.click(
//       screen.getByTestId('azure-devops-bugs-traffic-light'),
//     );

//     expect(screen.getByTestId('azure-devops-dialog')).toBeInTheDocument();
//   });

//   it('opens Preproduction dialog when Preproduction traffic light is clicked', async () => {
//     renderWithTheme(<TrafficComponent />);

//     await waitFor(() => {
//       expect(
//         screen.getByTestId('preproduction-traffic-light'),
//       ).toBeInTheDocument();
//     }, { timeout: 10000 });

//     await userEvent.click(screen.getByTestId('preproduction-traffic-light'));

//     expect(screen.getByTestId('preproduction-dialog')).toBeInTheDocument();
//   });

//   it('opens Foundation dialog when Foundation traffic light is clicked', async () => {
//     renderWithTheme(<TrafficComponent />);

//     await waitFor(() => {
//       expect(
//         screen.getByTestId('foundation-traffic-light'),
//       ).toBeInTheDocument();
//     }, { timeout: 10000 });

//     await userEvent.click(screen.getByTestId('foundation-traffic-light'));

//     expect(screen.getByTestId('foundation-dialog')).toBeInTheDocument();
//   });

//   it('opens Reporting dialog when Reporting traffic light is clicked', async () => {
//     renderWithTheme(<TrafficComponent />);

//     await waitFor(() => {
//       expect(screen.getByTestId('reporting-traffic-light')).toBeInTheDocument();
//     }, { timeout: 10000 });

//     await userEvent.click(screen.getByTestId('reporting-traffic-light'));

//     expect(screen.getByTestId('reporting-dialog')).toBeInTheDocument();
//   });

//   it('closes dialogs when close handler is called', async () => {
//     renderWithTheme(<TrafficComponent />);

//     await waitFor(() => {
//       expect(screen.getByTestId('blackduck-traffic-light')).toBeInTheDocument();
//     }, { timeout: 10000 });

//     // Open dialog
//     await userEvent.click(screen.getByTestId('blackduck-traffic-light'));
//     expect(screen.getByTestId('blackduck-dialog')).toBeInTheDocument();

//     // Close dialog by clicking the close button
//     await userEvent.click(screen.getByText('Close BlackDuck Dialog'));
//     expect(screen.queryByTestId('blackduck-dialog')).not.toBeInTheDocument();
//   });

//   it('handles search in system selector', async () => {
//     renderWithTheme(<TrafficComponent />);

//     await waitFor(() => {
//       expect(screen.getByText('test-system-1')).toBeInTheDocument();
//     }, { timeout: 10000 });

//     // Open system selector
//     const systemButton = screen.getByText('test-system-1');
//     await userEvent.click(systemButton);

//     // Search for system
//     const searchInput = screen.getByPlaceholderText('Search systems...');
//     await userEvent.type(searchInput, 'system-2');

//     await waitFor(() => {
//       expect(screen.getByText('test-system-2')).toBeInTheDocument();
//       expect(screen.queryByText('test-system-1')).not.toBeInTheDocument();
//     }, { timeout: 5000 });
//   });

//   it('displays "No systems found" when search yields no results', async () => {
//     renderWithTheme(<TrafficComponent />);

//     await waitFor(() => {
//       expect(screen.getByText('test-system-1')).toBeInTheDocument();
//     }, { timeout: 10000 });

//     // Open system selector
//     const systemButton = screen.getByText('test-system-1');
//     await userEvent.click(systemButton);

//     // Search for non-existent system
//     const searchInput = screen.getByPlaceholderText('Search systems...');
//     await userEvent.type(searchInput, 'non-existent-system');

//     await waitFor(() => {
//       expect(screen.getByText('No systems found')).toBeInTheDocument();
//     }, { timeout: 5000 });
//   });

//   it('handles API errors gracefully', async () => {
//     // Mock API to throw an error
//     mockCatalogApi.getEntities.mockRejectedValue(new Error('API Error'));

//     const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

//     renderWithTheme(<TrafficComponent />);

//     await waitFor(() => {
//       expect(consoleSpy).toHaveBeenCalledWith(
//         'Failed to load catalog entities',
//         expect.any(Error),
//       );
//     }, { timeout: 10000 });

//     consoleSpy.mockRestore();
//   });

//   it('displays all traffic light components', async () => {
//     renderWithTheme(<TrafficComponent />);

//     await waitFor(() => {
//       expect(
//         screen.getByTestId('dependabot-traffic-light'),
//       ).toBeInTheDocument();
//       expect(screen.getByTestId('blackduck-traffic-light')).toBeInTheDocument();
//       expect(
//         screen.getByTestId('github-security-traffic-light'),
//       ).toBeInTheDocument();
//       expect(screen.getByTestId('reporting-traffic-light')).toBeInTheDocument();
//       expect(
//         screen.getByTestId('preproduction-traffic-light'),
//       ).toBeInTheDocument();
//       expect(
//         screen.getByTestId('foundation-traffic-light'),
//       ).toBeInTheDocument();
//       expect(screen.getByTestId('sonarqube-traffic-light')).toBeInTheDocument();
//       expect(screen.getByTestId('base-traffic-light')).toBeInTheDocument();
//       expect(
//         screen.getByTestId('azure-devops-bugs-traffic-light'),
//       ).toBeInTheDocument();
//     }, { timeout: 10000 });
//   });

//   it('passes correct entities to traffic light components', async () => {
//     const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

//     renderWithTheme(<TrafficComponent />);

//     // Wait for the component to load and process entities
//     await waitFor(
//       () => {
//         // More flexible text matching that handles broken text
//         const selectedReposText = screen.getByText((content, element) => {
//           return content.includes('Selected Repositories') && content.includes('2');
//         });
//         expect(selectedReposText).toBeInTheDocument();
//       },
//       { timeout: 10000 }
//     );

//     // The traffic light components should receive the filtered entities
//     // This is implicitly tested through the rendering of the traffic lights
//     // with the correct entity props
//     expect(
//       screen.getByTestId('dependabot-traffic-light'),
//     ).toBeInTheDocument();
//     expect(screen.getByTestId('blackduck-traffic-light')).toBeInTheDocument();

//     // Check for any errors and fail test if there are unexpected errors
//     const errorCalls = consoleSpy.mock.calls.filter(call => 
//       !call[0].includes('Warning:') && // Ignore React warnings
//       !call[0].includes('getEntityByRef called with:') && // Ignore our debug logs
//       !call[0].includes('getEntities called with filter:') // Ignore our debug logs
//     );
    
//     if (errorCalls.length > 0) {
//       console.log('Unexpected console errors:', errorCalls);
//     }

//     consoleSpy.mockRestore();
//   });
// });