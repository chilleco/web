'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { PageHeader } from '@/shared/ui/page-header';
import { Box } from '@/shared/ui/box';
import {
    CheckCircleIcon,
    ChevronRightIcon,
    CoinsIcon,
    LoadingIcon,
    RefreshIcon,
    TasksIcon,
} from '@/shared/ui/icons';
import { cn } from '@/shared/lib/utils';
import { IconButton } from '@/shared/ui/icon-button';
import { useToastActions } from '@/shared/hooks/useToast';
import { useApiErrorMessage } from '@/shared/hooks/useApiErrorMessage';
import { checkTask, getTasks } from '@/entities/task/api/tasks';
import type { Task } from '@/entities/task/model/task';
import { resolveLocalizedText, resolveTaskColorStyles, resolveTaskIcon } from '@/entities/task/lib/presentation';

const shouldDelayCheck = (link?: string) => {
    if (!link) return false;
    if (link === 'story') return true;
    return link.includes('t.me');
};

const openTaskLink = (link: string) => {
    if (typeof window === 'undefined') return;
    if (link === 'story') return;

    const tma = window.Telegram?.WebApp as
        | { openTelegramLink?: (url: string) => void; openLink?: (url: string) => void }
        | undefined;

    if (tma?.openTelegramLink && link.startsWith('https://t.me/')) {
        tma.openTelegramLink(link);
        return;
    }

    if (tma?.openLink) {
        tma.openLink(link);
        return;
    }

    window.open(link, '_blank', 'noopener,noreferrer');
};

function TaskItem({
    task,
    locale,
    isChecking,
    onClick,
}: {
    task: Task;
    locale: string;
    isChecking: boolean;
    onClick: (task: Task) => void;
}) {
    const tTasks = useTranslations('tasks');
    const { iconContainer, rewardText } = resolveTaskColorStyles(task.color);

    const title = resolveLocalizedText(task.title, locale);
    const description = resolveLocalizedText(task.data, locale);
    const buttonLabel = resolveLocalizedText(task.button, locale);

    const reward = typeof task.reward === 'number' ? task.reward : 0;
    const isCompleted = task.status === 3;
    const isDisabled = isCompleted || isChecking;

    return (
        <Box
            size="default"
            className={cn(
                'transition-all duration-300 ease-[cubic-bezier(0,0,0.5,1)]',
                !isDisabled ? 'hover:scale-[1.01] cursor-pointer' : 'cursor-default',
                isCompleted ? 'opacity-70' : ''
            )}
        >
            <button
                type="button"
                className={cn('w-full text-left', !isDisabled ? 'cursor-pointer' : 'cursor-default')}
                onClick={() => onClick(task)}
                disabled={isDisabled}
            >
                <div className="flex items-start gap-4">
                    <div className={cn('flex items-center justify-center shrink-0 rounded-[0.75rem] w-12 h-12 mt-0.5', iconContainer)}>
                        {resolveTaskIcon(task.icon)}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-base font-semibold text-foreground truncate">
                                    {title || tTasks('fallbackTitle', { id: task.id })}
                                </div>
                                {reward > 0 && (
                                    <div className={cn('mt-0.5 inline-flex items-center gap-1 text-sm font-extrabold', rewardText)}>
                                        <span>{`+${reward}`}</span>
                                        <CoinsIcon size={14} />
                                    </div>
                                )}
                            </div>

                            <div className="shrink-0 text-muted-foreground">
                                {isChecking ? (
                                    <LoadingIcon size={18} className="animate-spin" />
                                ) : isCompleted ? (
                                    <CheckCircleIcon size={18} className="text-[var(--font-green)]" />
                                ) : (
                                    <ChevronRightIcon size={18} />
                                )}
                            </div>
                        </div>

                        {!isCompleted && description && (
                            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                                {description}
                            </p>
                        )}

                        {!isCompleted && buttonLabel && (
                            <div className="mt-3 text-sm font-medium text-foreground/90">
                                {buttonLabel}
                            </div>
                        )}
                    </div>
                </div>
            </button>
        </Box>
    );
}

export default function TasksPage() {
    const locale = useLocale();
    const tNavigation = useTranslations('navigation');
    const tSystem = useTranslations('system');
    const tTasks = useTranslations('tasks');
    const { success: showSuccess, info: showInfo, error: showError } = useToastActions();
    const formatApiErrorMessage = useApiErrorMessage();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [balance, setBalance] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [checkingIds, setCheckingIds] = useState<Set<number>>(new Set());

    const fetchInFlightRef = useRef(false);

    const orderedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => {
            const statusA = a.status ?? 0;
            const statusB = b.status ?? 0;
            if (statusA !== statusB) return statusA - statusB;
            const priorityA = a.priority ?? 0;
            const priorityB = b.priority ?? 0;
            return priorityB - priorityA;
        });
    }, [tasks]);

    const loadTasks = useCallback(async (mode: 'initial' | 'refresh') => {
        if (fetchInFlightRef.current) return;
        fetchInFlightRef.current = true;

        if (mode === 'refresh') {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            const response = await getTasks({ limit: 100 });
            setTasks(response.tasks);
            setBalance(typeof response.balance === 'number' ? response.balance : null);
        } catch (err) {
            showError(formatApiErrorMessage(err, tSystem('server_error')));
        } finally {
            fetchInFlightRef.current = false;
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [formatApiErrorMessage, showError, tSystem]);

    useEffect(() => {
        loadTasks('initial');
    }, [loadTasks]);

    const handleRefresh = () => loadTasks('refresh');

    const handleTaskClick = async (task: Task) => {
        if (task.status === 3) return;
        if (checkingIds.has(task.id)) return;

        setCheckingIds((prev) => new Set(prev).add(task.id));

        try {
            if (task.link) {
                openTaskLink(task.link);
            }

            const delayMs = shouldDelayCheck(task.link) ? 4000 : 0;
            if (delayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }

            const result = await checkTask(task.id);

            setBalance(typeof result.balance === 'number' ? result.balance : balance);
            setTasks((prev) =>
                prev.map((item) => (item.id === task.id ? { ...item, status: result.new } : item))
            );

            if (result.new === 3 && result.reward > 0) {
                showSuccess(tTasks('claimSuccess', { reward: result.reward }));
            } else if (result.new !== 3) {
                showInfo(tTasks('claimNotReady'));
            }
        } catch (err) {
            showError(formatApiErrorMessage(err, tSystem('server_error')));
        } finally {
            setCheckingIds((prev) => {
                const next = new Set(prev);
                next.delete(task.id);
                return next;
            });
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-3xl mx-auto">
                    <PageHeader
                        icon={<TasksIcon size={24} />}
                        iconClassName="bg-[var(--bg-blue)] text-[var(--font-blue)]"
                        title={tNavigation('tasks')}
                        description={tTasks('description')}
                        actions={
                            <IconButton
                                icon={<RefreshIcon size={16} />}
                                responsive
                                variant="outline"
                                onClick={handleRefresh}
                                disabled={isRefreshing || isLoading}
                            >
                                {tSystem('refresh')}
                            </IconButton>
                        }
                    />

                    <div className="space-y-3">
                        {balance !== null && (
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-sm text-muted-foreground">{tTasks('balanceLabel')}</div>
                                <div className="inline-flex items-center gap-1 text-sm font-bold text-foreground">
                                    <span>{balance}</span>
                                    <CoinsIcon size={14} />
                                </div>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">
                                {tSystem('loading')}
                            </div>
                        ) : orderedTasks.length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">
                                {tTasks('empty')}
                            </div>
                        ) : (
                            orderedTasks.map((task) => (
                                <TaskItem
                                    key={task.id}
                                    task={task}
                                    locale={locale}
                                    isChecking={checkingIds.has(task.id)}
                                    onClick={handleTaskClick}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
