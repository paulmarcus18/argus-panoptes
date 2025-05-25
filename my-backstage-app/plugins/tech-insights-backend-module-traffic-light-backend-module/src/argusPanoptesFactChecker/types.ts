import { Entity } from '@backstage/catalog-model';
import { TechInsightCheck, TechInsightsStore } from '@backstage/plugin-tech-insights-node';
import { TopLevelCondition } from 'json-rules-engine';
import {
  BooleanCheckResult,
  CheckResponse,
  Check,
} from '@backstage-community/plugin-tech-insights-common';

/**
 * @public
 */
export type Rule = {
  conditions: TopLevelCondition;
  name?: string;
  priority?: number;
};

/**
 * @public
 */
export interface TechInsightArgusPanoptesRuleCheck extends Check {
  rule: Rule;
}


/**
 * @public
 */
export type CheckCondition = {
  operator: string;
  fact: string;
  factValue: any;
  factResult: any;
  result: boolean;
};

/**
 * @public
 */
export type ResponseTopLevelCondition =
  | { all: CheckCondition[] }
  | { any: CheckCondition[] };

/**
 * @public
 */
export interface ArgusPanoptesRuleCheckResponse extends CheckResponse {
  rule: {
    conditions: ResponseTopLevelCondition & {
      priority: number;
    };
  };
}

/**
 * @public
 */
export interface ArgusPanoptesRuleBooleanCheckResult extends BooleanCheckResult {
  check: ArgusPanoptesRuleCheckResponse;
}

export interface CatalogFactCheckerOptions {
  factIds: string[];
  entityFilter?: (entity: Entity) => boolean;
  catalogParamKey: string; // The key in catalog-info.yaml to extract parameters from
}

export interface CatalogFactCheckerFactoryOptions {
  techInsightsStore: TechInsightsStore;
  catalogClient: any; // Use proper typing from @backstage/catalog-client
}

export interface CatalogFactCheckerFactory {
  create(options: CatalogFactCheckerOptions): TechInsightCheck;
}

