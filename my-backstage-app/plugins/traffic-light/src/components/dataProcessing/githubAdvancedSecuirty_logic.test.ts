import { Entity } from '@backstage/catalog-model';
import { 
  createEntityRef,
  extractInfoFromDirectLink,
  createEmptyMetrics,
  createDefaultSecurityData,
  sortIssuesBySeverity,
  processGitHubSecurityData,
  IssueDetail,
} from './githubAdvancedSecurity_logic'; 

// Mock the external dependencies
jest.mock('../utils', () => ({
  getGitHubSecurityFacts: jest.fn(),
}));

import { getGitHubSecurityFacts, GitHubSecurityFacts } from '../utils';

const mockGetGitHubSecurityFacts = getGitHubSecurityFacts as jest.MockedFunction<typeof getGitHubSecurityFacts>;

// Mock tech insights API
const mockTechInsightsApi = {
  runChecks: jest.fn(),
} as any;

describe('GitHub Security Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEntityRef', () => {
    it('should create entity ref with default namespace', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test-component',
        },
        spec: {},
      };

      const result = createEntityRef(entity);

      expect(result).toEqual({
        kind: 'Component',
        namespace: 'default',
        name: 'test-component',
      });
    });

    it('should create entity ref with specified namespace', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test-component',
          namespace: 'custom-namespace',
        },
        spec: {},
      };

      const result = createEntityRef(entity);

      expect(result).toEqual({
        kind: 'Component',
        namespace: 'custom-namespace',
        name: 'test-component',
      });
    });
  });

  // Testing the function that extracts information from a direct link given from json
  describe('extractInfoFromDirectLink', () => {
    it('should extract repo name and file path from valid GitHub URL', () => {
      const directLink = 'https://github.com/owner/repo/blob/main/src/components/test.ts';
      
      const result = extractInfoFromDirectLink(directLink);
      
      expect(result).toEqual({
        repoName: 'owner/repo',
        filePath: 'src/components/test.ts',
      });
    });

    it('should handle GitHub URL without file path', () => {
      const directLink = 'https://github.com/owner/repo/blob/main';
      
      const result = extractInfoFromDirectLink(directLink);
      
      expect(result).toEqual({
        repoName: 'owner/repo',
        filePath: '',
      });
    });

    it('should handle invalid URL in a graceful way', () => {
      const directLink = 'not-a-valid-url';
      
      const result = extractInfoFromDirectLink(directLink);
      
      expect(result).toEqual({
        repoName: '',
        filePath: '',
      });
    });

    it('should handle empty string', () => {
      const result = extractInfoFromDirectLink('');
      
      expect(result).toEqual({
        repoName: '',
        filePath: '',
      });
    });
  });
  
  // Testing the function that creates empty metrics for default traffic
  describe('createEmptyMetrics', () => {
    it('should create metrics object with all values as zero', () => {
      const result = createEmptyMetrics();
      
      expect(result).toEqual({
        totalIssues: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
        totalCodeScanningAlerts: 0,
        totalSecretScanningAlerts: 0,
      });
    });
  });

  // Testing the function that creates default security data
  describe('createDefaultSecurityData', () => {
    it('should create default security data with gray status', () => {
      const result = createDefaultSecurityData();
      
      expect(result).toEqual({
        color: 'gray',
        metrics: createEmptyMetrics(),
        summary: 'Failed to load GitHub Advanced Security data.',
        details: [],
      });
    });
  });

  // Testing sorting the issues, as we want them to be sorted on the UI for the user
  // From the higherst to lowest severity
  describe('sortIssuesBySeverity', () => {
    it('should sort issues by severity priority', () => {
      const issues: IssueDetail[] = [
        { severity: 'low', description: 'Low issue' },
        { severity: 'critical', description: 'Critical issue' },
        { severity: 'medium', description: 'Medium issue' },
        { severity: 'high', description: 'High issue' },
      ];

      const result = sortIssuesBySeverity(issues);

      expect(result.map((issue: IssueDetail) => issue.severity)).toEqual([
        'critical',
        'high',
        'medium',
        'low',
      ]);
    });

    it('should handle sorting an empty array', () => {
      const result = sortIssuesBySeverity([]);
      expect(result).toEqual([]);
    });
  });

  // Testing the function that processes GitHub security data
  // This function is responsible for processing the data and returning how many 
  // issues are there, and based on the outcome return the color of the traffic light
  describe('processGitHubSecurityData', () => {
    const mockEntity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
      },
      spec: {},
    };

    it('should process data with no security issues', async () => {
      const mockSecurityFacts: GitHubSecurityFacts = {
        openCodeScanningAlertCount: 0,
        openSecretScanningAlertCount: 0,
        codeScanningAlerts: {},
        secretScanningAlerts: {},
      };

      mockTechInsightsApi.runChecks.mockResolvedValue([
        { check: { id: 'githubSecretScanningCheck' }, result: true },
      ]);
      mockGetGitHubSecurityFacts.mockResolvedValue(mockSecurityFacts);

      const result = await processGitHubSecurityData(mockTechInsightsApi, [mockEntity]);

      expect(result).toEqual({
        color: 'green',
        metrics: {
          totalIssues: 0,
          criticalIssues: 0,
          highIssues: 0,
          mediumIssues: 0,
          lowIssues: 0,
          totalCodeScanningAlerts: 0,
          totalSecretScanningAlerts: 0,
        },
        summary: 'No security issues found.',
        details: [],
      });
    });

    it('should process data with critical issues', async () => {
      const mockSecurityFacts: GitHubSecurityFacts = {
        openCodeScanningAlertCount: 1,
        openSecretScanningAlertCount: 0,
        codeScanningAlerts: {
          '1': {
            severity: 'critical',
            description: 'Critical security issue',
            direct_link: 'https://github.com/owner/repo/blob/main/src/test.ts',
            created_at: '2023-01-01T00:00:00Z',
          },
        },
        secretScanningAlerts: {},
      };

      mockTechInsightsApi.runChecks.mockResolvedValue([
        { check: { id: 'githubSecretScanningCheck' }, result: true },
      ]);
      mockGetGitHubSecurityFacts.mockResolvedValue(mockSecurityFacts);

      const result = await processGitHubSecurityData(mockTechInsightsApi, [mockEntity]);

      expect(result.color).toBe('red');
      expect(result.summary).toBe('Security issues require immediate attention.');
      expect(result.metrics.criticalIssues).toBe(1);
      expect(result.details).toHaveLength(1);
      expect(result.details[0].severity).toBe('critical');
      expect(result.details[0].description).toBe('[owner/repo] Critical security issue');
    });

    it('should process data with high issues', async () => {
      const mockSecurityFacts: GitHubSecurityFacts = {
        openCodeScanningAlertCount: 1,
        openSecretScanningAlertCount: 0,
        codeScanningAlerts: {
          '1': {
            severity: 'high',
            description: 'High security issue',
            direct_link: 'https://github.com/owner/repo/blob/main/src/test.ts',
            created_at: '2023-01-01T00:00:00Z',
          },
        },
        secretScanningAlerts: {},
      };

      mockTechInsightsApi.runChecks.mockResolvedValue([
        { check: { id: 'githubSecretScanningCheck' }, result: true },
      ]);
      mockGetGitHubSecurityFacts.mockResolvedValue(mockSecurityFacts);

      const result = await processGitHubSecurityData(mockTechInsightsApi, [mockEntity]);

      expect(result.color).toBe('red');
      expect(result.metrics.highIssues).toBe(1);
    });

    it('should process data with medium issues', async () => {
      const mockSecurityFacts: GitHubSecurityFacts = {
        openCodeScanningAlertCount: 1,
        openSecretScanningAlertCount: 0,
        codeScanningAlerts: {
          '1': {
            severity: 'medium',
            description: 'Medium security issue',
            direct_link: 'https://github.com/owner/repo/blob/main/src/test.ts',
            created_at: '2023-01-01T00:00:00Z',
          },
        },
        secretScanningAlerts: {},
      };

      mockTechInsightsApi.runChecks.mockResolvedValue([
        { check: { id: 'githubSecretScanningCheck' }, result: true },
      ]);
      mockGetGitHubSecurityFacts.mockResolvedValue(mockSecurityFacts);

      const result = await processGitHubSecurityData(mockTechInsightsApi, [mockEntity]);

      expect(result.color).toBe('yellow');
      expect(result.summary).toBe('Security issues need to be addressed.');
      expect(result.metrics.mediumIssues).toBe(1);
    });

    // it('should process secret scanning alerts', async () => {
    //   const mockSecurityFacts: GitHubSecurityFacts = {
    //     openCodeScanningAlertCount: 0,
    //     openSecretScanningAlertCount: 1,
    //     codeScanningAlerts: {},
    //     secretScanningAlerts: {
    //       '1': {
    //         description: 'Secret found',
    //         html_url: 'https://github.com/owner/repo/security/secret-scanning/1',
    //         created_at: '2023-01-01T00:00:00Z',
    //       },
    //     },
    //   };

    //   mockTechInsightsApi.runChecks.mockResolvedValue([
    //     { check: { id: 'githubSecretScanningCheck' }, result: true },
    //   ]);
    //   mockGetGitHubSecurityFacts.mockResolvedValue(mockSecurityFacts);

    //   const result = await processGitHubSecurityData(mockTechInsightsApi, [mockEntity]);

    //   expect(result.color).toBe('red');
    //   expect(result.metrics.highIssues).toBe(1);
    //   expect(result.metrics.totalSecretScanningAlerts).toBe(1);
    //   expect(result.details[0].severity).toBe('high');
    // });

    it('should handle failed secret scanning check', async () => {
      const mockSecurityFacts: GitHubSecurityFacts = {
        openCodeScanningAlertCount: 0,
        openSecretScanningAlertCount: 0,
        codeScanningAlerts: {},
        secretScanningAlerts: {},
      };

      mockTechInsightsApi.runChecks.mockResolvedValue([
        { check: { id: 'githubSecretScanningCheck' }, result: false },
      ]);
      mockGetGitHubSecurityFacts.mockResolvedValue(mockSecurityFacts);

      const result = await processGitHubSecurityData(mockTechInsightsApi, [mockEntity]);

      expect(result.color).toBe('red');
      expect(result.summary).toBe('Secret scanning check failed. Security issues require immediate attention.');
    });

    it('should handle empty entities array', async () => {
      const result = await processGitHubSecurityData(mockTechInsightsApi, []);

      expect(result.color).toBe('green');
      expect(result.summary).toBe('No security issues found.');
    });

    it('should handle API errors gracefully', async () => {
      mockTechInsightsApi.runChecks.mockRejectedValue(new Error('API Error'));
      mockGetGitHubSecurityFacts.mockRejectedValue(new Error('API Error'));

      const result = await processGitHubSecurityData(mockTechInsightsApi, [mockEntity]);

      expect(result).toEqual(createDefaultSecurityData());
    });

    it('should handle missing check results', async () => {
      const mockSecurityFacts: GitHubSecurityFacts = {
        openCodeScanningAlertCount: 0,
        openSecretScanningAlertCount: 0,
        codeScanningAlerts: {},
        secretScanningAlerts: {},
      };

      mockTechInsightsApi.runChecks.mockResolvedValue([]);
      mockGetGitHubSecurityFacts.mockResolvedValue(mockSecurityFacts);

      const result = await processGitHubSecurityData(mockTechInsightsApi, [mockEntity]);

      expect(result.color).toBe('green');
    });

    it('should handle multiple entities', async () => {
      const mockSecurityFacts1: GitHubSecurityFacts = {
        openCodeScanningAlertCount: 1,
        openSecretScanningAlertCount: 0,
        codeScanningAlerts: {
          '1': {
            severity: 'high',
            description: 'High issue in repo 1',
            direct_link: 'https://github.com/owner/repo1/blob/main/src/test.ts',
            created_at: '2023-01-01T00:00:00Z',
          },
        },
        secretScanningAlerts: {},
      };

      const mockSecurityFacts2: GitHubSecurityFacts = {
        openCodeScanningAlertCount: 1,
        openSecretScanningAlertCount: 0,
        codeScanningAlerts: {
          '1': {
            severity: 'medium',
            description: 'Medium issue in repo 2',
            direct_link: 'https://github.com/owner/repo2/blob/main/src/test.ts',
            created_at: '2023-01-01T00:00:00Z',
          },
        },
        secretScanningAlerts: {},
      };

      const mockEntity2: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test-component-2',
        },
        spec: {},
      };

      mockTechInsightsApi.runChecks.mockResolvedValue([
        { check: { id: 'githubSecretScanningCheck' }, result: true },
      ]);
      
      mockGetGitHubSecurityFacts
        .mockResolvedValueOnce(mockSecurityFacts1)
        .mockResolvedValueOnce(mockSecurityFacts2);

      const result = await processGitHubSecurityData(mockTechInsightsApi, [mockEntity, mockEntity2]);

      expect(result.color).toBe('red');
      expect(result.metrics.highIssues).toBe(1);
      expect(result.metrics.mediumIssues).toBe(1);
      expect(result.details).toHaveLength(2);
      expect(result.details[0].severity).toBe('high'); // Sorted by severity
      expect(result.details[1].severity).toBe('medium');
    });
  });
});