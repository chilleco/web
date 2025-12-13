import { api } from '@/shared/services/api';
import { API_ENDPOINTS } from '@/shared/constants';
import { type Task, type TaskDto, type TasksGetRequest, type TasksGetResponse } from '../model/types';

const mapTaskDto = (task: TaskDto): Task => ({
    id: task.id,
    title: task.title,
    description: task.description ?? '',
    category: (task.category as Task['category']) || 'daily',
    icon: task.icon || null,
    rewardLabel: task.reward_label ?? '',
    rewardValue: task.reward_value ?? null,
    rewardUnit: task.reward_unit ?? null,
    progressCurrent: Math.max(Number(task.progress_current ?? 0), 0),
    progressTarget: Math.max(Number(task.progress_target ?? 1), 1),
    state: (task.state as Task['state']) || 'in_progress',
    action: (task.action as Task['action']) || 'start',
    link: task.link || null,
    order: Number(task.order ?? 0),
    status: task.status ?? null,
    locale: task.locale ?? null,
    created: task.created ?? null,
    updated: task.updated ?? null,
});

export async function getTasks(params: TasksGetRequest = {}): Promise<{ tasks: Task[]; count: number | null }> {
    try {
        const response = await api.post<TasksGetResponse>(API_ENDPOINTS.TASKS.GET, params, {
            suppressGlobalErrorHandler: true,
        });

        const tasks = Array.isArray(response?.tasks) ? response.tasks.map(mapTaskDto) : [];
        const count = typeof response?.count === 'number' ? response.count : null;

        return { tasks, count };
    } catch (error) {
        // SSR path should not crash the page on transient API errors
        return { tasks: [], count: null };
    }
}
