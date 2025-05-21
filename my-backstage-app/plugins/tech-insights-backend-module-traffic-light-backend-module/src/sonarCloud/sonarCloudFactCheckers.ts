import { DynamicThresholdCheck } from '../argusPanoptesFactChecker/service/catalogFactChecker';

export const sonarCloudChecks: DynamicThresholdCheck[] = [
  { // SonarCloud bug check
    id: 'sonarcloud-bugs',
    name: 'SonarCloud Bugs',
    type: 'number',
    factIds: ['sonarcloud-fact-retriever', 'bugs'],
    annotationKeyThreshold: 'tech-insights.io/sonarcloud-bugs-threshold',
    annotationKeyOperator: 'tech-insights.io/sonarcloud-bugs-operator',
    description: 'Maximum allowed bugs from SonarCloud',
  },
  { // SonarCloud vulnerabilities check
    id: 'sonarcloud-vulnerabilities',
    name: 'SonarCloud Vulnerabilities',
    type: 'number',
    factIds: ['sonarcloud-fact-retriever', 'vulnerabilities'],
    annotationKeyThreshold: 'tech-insights.io/sonarcloud-vulnerabilities-threshold',
    annotationKeyOperator: 'tech-insights.io/sonarcloud-vulnerabilities-operator',
    description: 'Maximum allowed vulnerabilities from SonarCloud',
  },
  { // SonarCloud code smells check
    id: 'sonarcloud-code-smells',
    name: 'SonarCloud Code Smells',
    type: 'number',
    factIds: ['sonarcloud-fact-retriever', 'code_smells'],
    annotationKeyThreshold: 'tech-insights.io/sonarcloud-code-smells-threshold',
    annotationKeyOperator: 'tech-insights.io/sonarcloud-code-smells-operator',
    description: 'Maximum allowed code smells from SonarCloud',
  },
  { // SonarCloud code coverage check
    id: 'sonarcloud-code-coverage',
    name: 'SonarCloud Code Coverage',
    type: 'percentage',
    factIds: ['sonarcloud-fact-retriever', 'code_coverage'],
    annotationKeyThreshold: 'tech-insights.io/sonarcloud-code-coverage-threshold',
    annotationKeyOperator: 'tech-insights.io/sonarcloud-code-coverage-operator',
    description: 'Minimum required code coverage percentage from SonarCloud',
  },
  { // SonarCloud quality gate check
    id: 'sonarcloud-quality-gate',
    name: 'SonarCloud Quality Gate',
    type: 'boolean',
    factIds: ['sonarcloud-fact-retriever', 'quality_gate'],
    annotationKeyThreshold: 'tech-insights.io/sonarcloud-quality-gate',
    annotationKeyOperator: 'tech-insights.io/sonarcloud-quality-gate-operator',
    description: 'SonarCloud quality gate must pass',
  },
];
