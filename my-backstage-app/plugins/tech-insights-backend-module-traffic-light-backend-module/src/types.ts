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
export interface ArgusPanoptesRuleCheck extends Check {
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
export interface JsonRuleCheckResponse extends CheckResponse {
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
  check: JsonRuleCheckResponse;
}