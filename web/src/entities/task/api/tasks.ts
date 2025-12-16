import { apiWithoutGlobalErrors } from '@/shared/services/api/client';
import { API_ENDPOINTS } from '@/shared/constants';
import type { Task, TasksCheckResponse, TasksGetRequest, TasksGetResponse } from '../model/task';

type RawTasksGetResponse = {
  tasks?: Task[] | Task | null;
  balance?: number;
};

const normalizeTasks = (tasks?: Task[] | Task | null): Task[] => {
  if (!tasks) return [];
  return Array.isArray(tasks) ? tasks : [tasks];
};

export async function getTasks(payload: TasksGetRequest = {}): Promise<TasksGetResponse> {
  const response = await apiWithoutGlobalErrors.post<RawTasksGetResponse>(API_ENDPOINTS.TASKS.GET, {
    limit: payload.limit ?? 100,
    id: payload.id ?? null,
    offset: payload.offset ?? null,
  });

  return {
    tasks: normalizeTasks(response.tasks),
    balance: response.balance,
  };
}

export async function checkTask(id: number): Promise<TasksCheckResponse> {
  return apiWithoutGlobalErrors.post<TasksCheckResponse>(API_ENDPOINTS.TASKS.CHECK, { id });
}

