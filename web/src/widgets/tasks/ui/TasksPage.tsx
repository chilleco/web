'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { PageHeader } from '@/shared/ui/page-header';
import { Box } from '@/shared/ui/box';
import {
    CheckCircleIcon,
    ChevronRightIcon,
    CoinsIcon,
    LoadingIcon,
    RefreshIcon,
    ShareIcon,
    TasksIcon,
    UserGroupIcon,
} from '@/shared/ui/icons';
import { cn } from '@/shared/lib/utils';
import { IconButton } from '@/shared/ui/icon-button';
import { useToastActions } from '@/shared/hooks/useToast';
import { useApiErrorMessage } from '@/shared/hooks/useApiErrorMessage';
import { checkTask, getTasks } from '@/entities/task/api/tasks';
import type { Task } from '@/entities/task/model/task';
import { resolveLocalizedText, resolveTaskColorStyles, resolveTaskIcon } from '@/entities/task/lib/presentation';
import { getClientNetwork } from '@/shared/lib/app';
import { getVkLaunchQuery } from '@/shared/lib/vk';

type RouteHref = Parameters<ReturnType<typeof useRouter>['push']>[0];

const shouldDelayCheck = (link?: string) => {
    if (!link) return false;
    if (link === 'story') return true;
    return link.includes('t.me');
};

const isLocalTaskLink = (link: string) => {
    if (!link) return false;
    return ((link.startsWith('/') && !link.startsWith('//')) || link.startsWith('./'));
};

const openTaskLink = (link: string, localRedirect?: (link: string) => void) => {
    if (typeof window === 'undefined') return;
    if (link === 'story') return;

    if (isLocalTaskLink(link)) {
        if (localRedirect) {
            localRedirect(link);
        } else {
            window.location.assign(link);
        }
        return;
    }

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

const buildVkAppShareUrl = () => {
    if (typeof window === 'undefined') return '';

    const appIdFromPath = window.location.pathname.match(/\/app(\d+)/)?.[1] ?? null;
    const searchParams = new URLSearchParams(window.location.search);
    const appId = appIdFromPath || searchParams.get('vk_app_id');

    if (!appId) {
        return window.location.origin;
    }

    return `https://vk.com/app${appId}`;
};

type VkRecommendStatus = 'shared' | 'cancelled' | 'failed';

const isVkShareCancelled = (error: unknown) => {
    if (!error || typeof error !== 'object') return false;
    const payload = error as {
        error_type?: string;
        error_data?: { error_code?: number; error_reason?: string };
        message?: string;
    };

    if (payload.error_type === 'client_error' && payload.error_data?.error_code === 4) {
        return true;
    }

    const reason = payload.error_data?.error_reason || payload.message;
    if (!reason) return false;
    return /cancel|denied|abort/i.test(reason);
};

const openVkRecommend = async ({ url }: { url: string }): Promise<VkRecommendStatus> => {
    if (typeof window === 'undefined') return 'failed';
    const bridge = window.vkBridge;
    if (!bridge?.send) return 'failed';

    const supportsMethod = async (method: string) => {
        if (typeof bridge.supportsAsync === 'function') {
            try {
                return await bridge.supportsAsync(method);
            } catch {
                return false;
            }
        }
        return true;
    };
    const shareMethods: Array<{ method: string; params?: Record<string, unknown> }> = [];

    const canRecommend = await supportsMethod('VKWebAppRecommend');
    const canShare = await supportsMethod('VKWebAppShare');

    if (canRecommend) {
        shareMethods.push({ method: 'VKWebAppRecommend' });
    }

    if (canShare && url) {
        shareMethods.push({ method: 'VKWebAppShare', params: { link: url } });
    }

    if (!shareMethods.length) return 'failed';

    for (const { method, params } of shareMethods) {
        try {
            await bridge.send(method, params);
            return 'shared';
        } catch (err) {
            if (isVkShareCancelled(err)) return 'cancelled';
            // Try the next VK Bridge method.
        }
    }

    return 'failed';
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
                                    <CheckCircleIcon size={18} className="text-green-600 dark:text-green-400" />
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

function VkRecommendWidget({
    isLoading,
    onRecommend,
}: {
    isLoading: boolean;
    onRecommend: () => void;
}) {
    const tTasks = useTranslations('tasks');

    return (
        <Box size="default" className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
                <div className="flex items-center justify-center shrink-0 rounded-[0.75rem] w-12 h-12 bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                    <UserGroupIcon size={22} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold text-foreground">
                        {tTasks('vkRecommendTitle')}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {tTasks('vkRecommendDescription')}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                <IconButton
                    icon={<ShareIcon size={16} />}
                    responsive
                    variant="outline"
                    onClick={onRecommend}
                    disabled={isLoading}
                >
                    {tTasks('vkRecommendAction')}
                </IconButton>
            </div>
        </Box>
    );
}

export default function TasksPage() {
    const router = useRouter();
    const vkLaunchQuery = getVkLaunchQuery();

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
    const [isVkMiniApp, setIsVkMiniApp] = useState(false);
    const [isRecommending, setIsRecommending] = useState(false);

    const fetchInFlightRef = useRef(false);
    const recommendInFlightRef = useRef(false);

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

    useEffect(() => {
        if (typeof window === 'undefined') return;
        let mounted = true;

        const resolveVkSupport = async () => {
            const network = getClientNetwork();
            const bridge = window.vkBridge;
            if (network !== 'vk' || !bridge?.send) {
                if (mounted) setIsVkMiniApp(false);
                return;
            }

            if (typeof bridge.supportsAsync === 'function') {
                const [supportsRecommend, supportsShare] = await Promise.all([
                    bridge.supportsAsync('VKWebAppRecommend').catch(() => false),
                    bridge.supportsAsync('VKWebAppShare').catch(() => false),
                ]);
                if (mounted) setIsVkMiniApp(supportsRecommend || supportsShare);
                return;
            }

            if (mounted) setIsVkMiniApp(true);
        };

        void resolveVkSupport();

        return () => {
            mounted = false;
        };
    }, []);

    const handleRefresh = () => loadTasks('refresh');

    const localRedirect = useCallback((link: string) => {
        if (typeof window === 'undefined') return;

        const normalizedLink = link.startsWith('./') ? link.slice(1) : link;
        const url = new URL(normalizedLink, window.location.origin);

        const mergedSearchParams = new URLSearchParams();
        if (vkLaunchQuery) {
            Object.entries(vkLaunchQuery).forEach(([key, value]) => mergedSearchParams.append(key, value));
        }
        url.searchParams.forEach((value, key) => {
            mergedSearchParams.set(key, value);
        });

        const search = mergedSearchParams.toString();
        const href = `${url.pathname}${search ? `?${search}` : ''}${url.hash || ''}` as RouteHref;

        router.push(href);
    }, [router, vkLaunchQuery]);

    const handleTaskClick = async (task: Task) => {
        if (task.status === 3) return;
        if (checkingIds.has(task.id)) return;

        setCheckingIds((prev) => new Set(prev).add(task.id));

        try {
            if (task.link) {
                openTaskLink(task.link, localRedirect);
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

    const handleVkRecommend = useCallback(async () => {
        if (!isVkMiniApp) return;
        if (recommendInFlightRef.current) return;

        recommendInFlightRef.current = true;
        setIsRecommending(true);

        try {
            const url = buildVkAppShareUrl();
            const result = await openVkRecommend({ url });
            if (result === 'failed') {
                showError(tSystem('shareUnavailable'));
            }
        } catch (err) {
            showError(formatApiErrorMessage(err, tSystem('shareUnavailable')));
        } finally {
            recommendInFlightRef.current = false;
            setIsRecommending(false);
        }
    }, [formatApiErrorMessage, isVkMiniApp, showError, tSystem]);

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-3xl mx-auto">
                    <PageHeader
                        icon={<TasksIcon size={24} />}
                        iconClassName="bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
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
                        {/* {isVkMiniApp ? (
                            <VkRecommendWidget isLoading={isRecommending} onRecommend={handleVkRecommend} />
                        ) : null} */}

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
