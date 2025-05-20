import {
  BackstageCredentials,
  BackstageUserPrincipal,
} from '@backstage/backend-plugin-api';


// TODO: delete this
export interface TodoItem {
  title: string;
  id: string;
  createdBy: string;
  createdAt: string;
}

// TODO: delete this
export interface TodoListService {
  createTodo(
    input: {
      title: string;
      entityRef?: string;
    },
    options: {
      credentials: BackstageCredentials<BackstageUserPrincipal>;
    },
  ): Promise<TodoItem>;

  listTodos(): Promise<{ items: TodoItem[] }>;

  getTodo(request: { id: string }): Promise<TodoItem>;
}

// might need to change these based on database
export type MetricType =
  | 'df_average'
  | 'lead_time'
  | 'change_failure_rate'
  | 'time_to_restore';

export type Aggregation = 'weekly' | 'monthly';

export interface MetricItem {
  data_key: string;
  data_value: number;
}

export interface DoraService {
  getMetric(
    type: MetricType,
    aggregation: Aggregation,
    // project: string,
    // startDate: string,
    // endDate: string,
  ): Promise<MetricItem[]>;
}
