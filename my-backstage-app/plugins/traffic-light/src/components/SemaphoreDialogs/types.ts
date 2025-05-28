export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface IssueDetail {
  severity: Severity;
  description: string;
  component?: string;
  url?: string;
  directLink?: string;
}

export interface SemaphoreData {
  color: 'red' | 'yellow' | 'green' | 'gray';
  metrics: Record<string, any>;
  summary: string;
  details: IssueDetail[];
}
