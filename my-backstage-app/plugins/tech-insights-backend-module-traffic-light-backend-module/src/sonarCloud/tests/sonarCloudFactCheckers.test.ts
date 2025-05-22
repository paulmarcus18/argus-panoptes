import { sonarCloudChecks } from '../sonarCloudFactCheckers';

describe('SonarCloud Checks Configuration', () => {
  const requiredFields = [
    'id', 
    'name', 
    'type', 
    'factIds', 
    'annotationKeyThreshold', 
    'annotationKeyOperator', 
    'description'
  ];

  // Test: each check should have the required fields
  test('each check has all required fields', () => {
    sonarCloudChecks.forEach(check => {
      requiredFields.forEach(field => {
        expect(check).toHaveProperty(field);
      });
    });
  });

  // Test: naming conventions for the fact checkers
  test('each check follows the naming conventions', () => {
    sonarCloudChecks.forEach(check => {
      // Check IDs follow the pattern 'sonarcloud-*'
      expect(check.id).toMatch(/^sonarcloud-/);
      
      // Check that annotation keys follow convention
      expect(check.annotationKeyThreshold).toMatch(/^tech-insights\.io\/sonarcloud-/);
      expect(check.annotationKeyOperator).toMatch(/^tech-insights\.io\/sonarcloud-/);
      
      // Check that all factIds arrays start with the correct retriever
      expect(check.factIds[0]).toBe('sonarcloud-fact-retriever');
    });
  });

  // Test: check if all metrics are covered by the fact checkers
  test('checks cover expected metrics', () => {
    // Verify that important metrics are covered
    const expectedMetrics = ['bugs', 'vulnerabilities', 'code_smells', 'code_coverage', 'quality_gate'];
    
    // Extract second factId (the actual metric being checked)
    const coveredMetrics = sonarCloudChecks.map(check => check.factIds[1]);
    
    // Ensure all expected metrics are covered
    expectedMetrics.forEach(metric => {
      expect(coveredMetrics).toContain(metric);
    });
  });
});
