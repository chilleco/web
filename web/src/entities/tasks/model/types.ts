export type TaskState = 'in_progress' | 'ready' | 'claimed';
export type TaskAction = 'start' | 'claim';
export type TaskCategory = 'daily' | 'seasonal' | 'referral' | 'bonus';

export type Task = {
    id: number;
    title: string;
    description?: string | null;
    category: TaskCategory;
    icon?: string | null;
    rewardLabel?: string | null;
    rewardValue?: number | null;
    rewardUnit?: string | null;
    progressCurrent: number;
    progressTarget: number;
    state: TaskState;
    action: TaskAction;
    link?: string | null;
    order: number;
    status?: number | null;
    locale?: string | null;
    created?: number | null;
    updated?: number | null;
};

export type TaskDto = {
    id: number;
    title: string;
    description?: string | null;
    category?: string | null;
    icon?: string | null;
    reward_label?: string | null;
    reward_value?: number | null;
    reward_unit?: string | null;
    progress_current?: number | null;
    progress_target?: number | null;
    state?: string | null;
    action?: string | null;
    link?: string | null;
    order?: number | null;
    status?: number | null;
    locale?: string | null;
    created?: number | null;
    updated?: number | null;
};

export type TasksGetResponse = {
    tasks: TaskDto[];
    count: number | null;
};

export type TasksGetRequest = {
    category?: string;
    state?: string;
    status?: number;
    limit?: number;
    offset?: number;
    locale?: string;
};
