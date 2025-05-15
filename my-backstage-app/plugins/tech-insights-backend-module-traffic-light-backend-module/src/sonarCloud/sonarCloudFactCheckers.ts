import { TechInsightJsonRuleCheck } from '@backstage/plugin-tech-insights-backend-module-jsonfc';
import { Config } from '@backstage/config';

export const createBugsCheck = (config: Config): TechInsightJsonRuleCheck => {
    const name = config.getOptionalString('techInsights.factChecker.checks.noHighBugsCheck.name') ?? '';
    const description = config.getOptionalString('techInsights.factChecker.checks.noHighBugsCheck.description') ?? '';
    const factIds = config.getOptionalStringArray('techInsights.factChecker.checks.noHighBugsCheck.factIds') ?? [];
    const factName = config
      .getOptionalConfig('techInsights.factChecker.checks.noHighBugsCheck.rule.conditions')
      ?.getConfigArray('all')[0]
      ?.getString('fact') ?? '';
      
    const operator = config
      .getOptionalConfig('techInsights.factChecker.checks.noHighBugsCheck.rule.conditions')
      ?.getConfigArray('all')[0]
      ?.getString('operator') ?? '';
    
    const value = config
      .getOptionalConfig('techInsights.factChecker.checks.noHighBugsCheck.rule.conditions')
      ?.getConfigArray('all')[0]
      ?.getNumber('value') ?? 0.0;

    return {
        id: 'noHighBugsCheck',
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

export const createCodeSmellsCheck = (config: Config): TechInsightJsonRuleCheck => {
    const name = config.getOptionalString('techInsights.factChecker.checks.noHighCodeSmellsCheck.name') ?? '';
    const description = config.getOptionalString('techInsights.factChecker.checks.noHighCodeSmellsCheck.description') ?? '';
    const factIds = config.getOptionalStringArray('techInsights.factChecker.checks.noHighCodeSmellsCheck.factIds') ?? [];
    const factName = config
      .getOptionalConfig('techInsights.factChecker.checks.noHighCodeSmellsCheck.rule.conditions')
      ?.getConfigArray('all')[0]
      ?.getString('fact') ?? '';
      
    const operator = config
      .getOptionalConfig('techInsights.factChecker.checks.noHighCodeSmellsCheck.rule.conditions')
      ?.getConfigArray('all')[0]
      ?.getString('operator') ?? '';
    
    const value = config
      .getOptionalConfig('techInsights.factChecker.checks.noHighCodeSmellsCheck.rule.conditions')
      ?.getConfigArray('all')[0]
      ?.getNumber('value') ?? 0.0;

    return {
        id: 'noHighCodeSmellsCheck',
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

export const createVulnerabilitiesCheck = (config: Config): TechInsightJsonRuleCheck => {
    const name = config.getOptionalString('techInsights.factChecker.checks.vulnerabilitiesCheck.name') ?? '';
    const description = config.getOptionalString('techInsights.factChecker.checks.vulnerabilitiesCheck.description') ?? '';
    const factIds = config.getOptionalStringArray('techInsights.factChecker.checks.vulnerabilitiesCheck.factIds') ?? [];
    const factName = config
      .getOptionalConfig('techInsights.factChecker.checks.vulnerabilitiesCheck.rule.conditions')
      ?.getConfigArray('all')[0]
      ?.getString('fact') ?? '';
      
    const operator = config
      .getOptionalConfig('techInsights.factChecker.checks.vulnerabilitiesCheck.rule.conditions')
      ?.getConfigArray('all')[0]
      ?.getString('operator') ?? '';
    
    const value = config
      .getOptionalConfig('techInsights.factChecker.checks.vulnerabilitiesCheck.rule.conditions')
      ?.getConfigArray('all')[0]
      ?.getNumber('value') ?? 0.0;

    return {
        id: 'vulnerabilitiesCheck',
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

export const createQualityGateCheck = (config: Config): TechInsightJsonRuleCheck => {
    const name = config.getOptionalString('techInsights.factChecker.checks.qualityGateCheck.name') ?? '';
    const description = config.getOptionalString('techInsights.factChecker.checks.qualityGateCheck.description') ?? '';
    const factIds = config.getOptionalStringArray('techInsights.factChecker.checks.qualityGateCheck.factIds') ?? [];
    const factName = config
      .getOptionalConfig('techInsights.factChecker.checks.qualityGateCheck.rule.conditions')
      ?.getConfigArray('all')[0]
      ?.getString('fact') ?? '';
      
    const operator = config
      .getOptionalConfig('techInsights.factChecker.checks.qualityGateCheck.rule.conditions')
      ?.getConfigArray('all')[0]
      ?.getString('operator') ?? '';
    
    const value = config
      .getOptionalConfig('techInsights.factChecker.checks.qualityGateCheck.rule.conditions')
      ?.getConfigArray('all')[0]
      ?.getString('value') ?? '';

    return {
        id: 'qualityGateCheck',
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

export const createCodeCoverageCheck = (config: Config): TechInsightJsonRuleCheck => {
    const name = config.getOptionalString('techInsights.factChecker.checks.codeCoverageCheck.name') ?? '';
    const description = config.getOptionalString('techInsights.factChecker.checks.codeCoverageCheck.description') ?? '';
    const factIds = config.getOptionalStringArray('techInsights.factChecker.checks.codeCoverageCheck.factIds') ?? [];
    const factName = config
      .getOptionalConfig('techInsights.factChecker.checks.codeCoverageCheck.rule.conditions')
      ?.getConfigArray('all')[0]
      ?.getString('fact') ?? '';
      
    const operator = config
      .getOptionalConfig('techInsights.factChecker.checks.codeCoverageCheck.rule.conditions')
      ?.getConfigArray('all')[0]
      ?.getString('operator') ?? '';
    
    const value = config
      .getOptionalConfig('techInsights.factChecker.checks.codeCoverageCheck.rule.conditions')
      ?.getConfigArray('all')[0]
      ?.getNumber('value') ?? 0.0;

    return {
        id: 'codeCoverageCheck',
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