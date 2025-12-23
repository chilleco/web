export type LocalizedText = Record<string, string>;

export type TaskColor = 'green' | 'violet' | 'blue' | 'orange' | string;

/**
 * Task definition returned by `/tasks/get/`.
 *
 * Notes:
 * - User mode (default): backend derives `status` as completion state (`1` new, `3` completed).
 * - Admin mode (`admin: true`): backend returns DB `status` (`0` disabled, `1` active).
 * - `link` may contain a literal `'{}'` placeholder; user mode formats it with the user's Telegram id.
 * - `verify` maps to a backend module under `api/app/verify/<verify>.py`; `params` is passed to that verifier.
 */
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
  network?: string;
  created?: number;
  updated?: number;
}

export interface TasksGetRequest {
  id?: number | number[] | null;
  limit?: number;
  offset?: number | null;
  /** When true, returns raw task definitions for admin UI (requires admin access). */
  admin?: boolean;
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

export interface TaskSaveRequest {
  id?: number;
  title?: LocalizedText;
  data?: LocalizedText;
  button?: LocalizedText;
  link?: string;
  icon?: string;
  color?: TaskColor;
  size?: number;
  expired?: number;
  reward?: number;
  verify?: string;
  params?: Record<string, unknown>;
  priority?: number;
  status?: number;
  network?: string;
}

export interface TaskSaveResponse {
  id: number;
  new: boolean;
  task: Task;
}
