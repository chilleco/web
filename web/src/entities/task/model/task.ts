export type LocalizedText = Record<string, string>;

export type TaskColor = 'green' | 'violet' | 'blue' | 'orange' | string;

export interface Task {
  id: number;
  title?: LocalizedText;
  data?: LocalizedText;
  button?: LocalizedText;
  link?: string;
  icon?: string;
  reward?: number;
  verify?: string;
  params?: Record<string, unknown>;
  priority?: number;
  color?: TaskColor;
  status?: number;
  expired?: number;
  size?: number;
}

export interface TasksGetRequest {
  id?: number | number[] | null;
  limit?: number;
  offset?: number | null;
}

export interface TasksGetResponse {
  tasks: Task[];
  balance?: number;
}

export interface TasksCheckResponse {
  old: number;
  new: number;
  reward: number;
  balance?: number;
}

