import { TechInsightJsonRuleCheck } from '@backstage/plugin-tech-insights-backend-module-jsonfc';
import { Config } from '@backstage/config';

/**
 * Creates a Tech Insights fact checker for GitHub secret scanning alerts.
 * The rule configuration is loaded from the Backstage app config.
 * @param config - The Backstage app config object.
 * @returns A TechInsightJsonRuleCheck for GitHub secret scanning.
 */
export const createGitHubSecretScanningCheck = (config: Config): TechInsightJsonRuleCheck => {
  // Read configuration values for the check
  const name = config.getOptionalString('techInsights.factChecker.checks.githubSecretScanningCheck.name') ?? 
    'No Secret Scanning Alerts';
  const description = config.getOptionalString('techInsights.factChecker.checks.githubSecretScanningCheck.description') ?? 
    'Checks if there are no exposed secrets detected';
  const factIds = config.getOptionalStringArray('techInsights.factChecker.checks.githubSecretScanningCheck.factIds') ?? 
    ['githubAdvancedSecurityFactRetriever'];
  
  // Extract rule condition details
  const factName = config
    .getOptionalConfig('techInsights.factChecker.checks.githubSecretScanningCheck.rule.conditions')
    ?.getConfigArray('all')[0]
    ?.getString('fact') ?? 'openSecretScanningAlertCount';
    
  const operator = config
    .getOptionalConfig('techInsights.factChecker.checks.githubSecretScanningCheck.rule.conditions')
    ?.getConfigArray('all')[0]
    ?.getString('operator') ?? 'lessThanInclusive';
  
  const value = config
    .getOptionalConfig('techInsights.factChecker.checks.githubSecretScanningCheck.rule.conditions')
    ?.getConfigArray('all')[0]
    ?.getNumber('value') ?? 0;
  
  // Return the fact checker definition
  return {
    id: 'githubSecretScanningCheck',
    name: name,
    description: description,
    factIds: factIds,
    rule: {
      conditions: {
        all: [
          {
            fact: factName,
            operator: operator,
            value: value,
          },
        ],
      },
    },
    type: 'json-rules-engine',
  };
};
