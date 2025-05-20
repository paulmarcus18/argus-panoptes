import { DynamicThresholdCheck } from '../argusPanoptesFactChecker/service/catalogFactChecker';

export const sonarCloudChecks: DynamicThresholdCheck[] = [
  {
    id: 'sonarcloud-bugs',
    name: 'SonarCloud Bugs',
    type: 'number',
    factIds: ['sonarcloud-fact-retriever', 'bugs'],
    annotationKeyThreshold: 'tech-insights.io/sonarcloud-bugs-threshold',
    description: 'Maximum allowed bugs from SonarCloud',
  },
  {
    id: 'sonarcloud-vulnerabilities',
    name: 'SonarCloud Vulnerabilities',
    type: 'number',
    factIds: ['sonarcloud-fact-retriever', 'vulnerabilities'],
    annotationKeyThreshold: 'tech-insights.io/sonarcloud-vulnerabilities-threshold',
    description: 'Maximum allowed vulnerabilities from SonarCloud',
  },
  {
    id: 'sonarcloud-code-smells',
    name: 'SonarCloud Code Smells',
    type: 'number',
    factIds: ['sonarcloud-fact-retriever', 'code_smells'],
    annotationKeyThreshold: 'tech-insights.io/sonarcloud-code-smells-threshold',
    description: 'Maximum allowed code smells from SonarCloud',
  },
  {
    id: 'sonarcloud-code-coverage',
    name: 'SonarCloud Code Coverage',
    type: 'percentage',
    factIds: ['sonarcloud-fact-retriever', 'code_coverage'],
    annotationKeyThreshold: 'tech-insights.io/sonarcloud-code-coverage-threshold',
    description: 'Minimum required code coverage percentage from SonarCloud',
  },
  {
    id: 'sonarcloud-quality-gate',
    name: 'SonarCloud Quality Gate',
    type: 'boolean',
    factIds: ['sonarcloud-fact-retriever', 'quality_gate'],
    annotationKeyThreshold: 'tech-insights.io/sonarcloud-quality-gate',
    description: 'SonarCloud quality gate must pass (1=pass, 0=fail)',
  },
];
