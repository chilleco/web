import { apiWithoutGlobalErrors } from '@/shared/services/api/client';
import { API_ENDPOINTS } from '@/shared/constants';
import type { Task, TaskSaveRequest, TaskSaveResponse, TasksCheckResponse, TasksGetRequest, TasksGetResponse } from '../model/task';

type RawTasksGetResponse = {
  tasks?: Task[] | Task | null;
  balance?: number;
};

// ConSys `complex` endpoints sometimes return a single object instead of an array.
const normalizeTasks = (tasks?: Task[] | Task | null): Task[] => {
  if (!tasks) return [];
  return Array.isArray(tasks) ? tasks : [tasks];
};

export async function getTasks(payload: TasksGetRequest = {}): Promise<TasksGetResponse> {
  // `admin: true` switches backend to raw task definitions (no per-user completion status / link formatting).
  const response = await apiWithoutGlobalErrors.post<RawTasksGetResponse>(API_ENDPOINTS.TASKS.GET, {
    limit: payload.limit ?? 100,
    id: payload.id ?? null,
    offset: payload.offset ?? null,
    admin: payload.admin ?? false,
  });

  return {
    tasks: normalizeTasks(response.tasks),
    balance: response.balance,
  };
}

export async function checkTask(id: number): Promise<TasksCheckResponse> {
  return apiWithoutGlobalErrors.post<TasksCheckResponse>(API_ENDPOINTS.TASKS.CHECK, { id });
}

export async function saveTask(payload: TaskSaveRequest): Promise<TaskSaveResponse> {
  return apiWithoutGlobalErrors.post<TaskSaveResponse>(API_ENDPOINTS.TASKS.SAVE, payload);
}
