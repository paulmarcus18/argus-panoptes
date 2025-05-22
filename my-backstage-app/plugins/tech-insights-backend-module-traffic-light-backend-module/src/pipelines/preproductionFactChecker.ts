import { DynamicThresholdCheck } from '../argusPanoptesFactChecker/service/dynamicThresholdFactChecker';

export const preproductionPipelineChecks: DynamicThresholdCheck[] = [
  {
    id: 'preproduction-success-rate',
    name: 'Preproduction Pipeline Success Rate',
    type: 'percentage',
    factIds: ['githubPipelineStatusFactRetriever', 'successWorkflowRunsCount'],
    annotationKeyThreshold:
      'tech-insights.io/preproduction-success-rate-threshold',
    annotationKeyOperator:
      'tech-insights.io/preproduction-success-rate-operator',
    description:
      'Minimum pipeline success rate required for preproduction components',
  },
  {
    id: 'preproduction-max-failures',
    name: 'Preproduction Pipeline Max Failures',
    type: 'number',
    factIds: ['githubPipelineStatusFactRetriever', 'failureWorkflowRunsCount'],
    annotationKeyThreshold:
      'tech-insights.io/preproduction-max-failures-threshold',
    annotationKeyOperator:
      'tech-insights.io/preproduction-max-failures-operator',
    description:
      'Maximum number of failed workflow runs allowed for preproduction components',
  },
];
