'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { API_ENDPOINTS } from '@/shared/constants';
import { api } from '@/shared/services/api/client';
import { useToastActions } from '@/shared/hooks/useToast';
import { cn } from '@/shared/lib/utils';
import { Box } from '@/shared/ui/box';
import { IconButton } from '@/shared/ui/icon-button';
import { Input } from '@/shared/ui/input';
import { PageHeader } from '@/shared/ui/page-header';
import { EntityRow } from '@/shared/ui/entity-management';
import { Badge } from '@/shared/ui/badge';
import { AnalyticsStats, useAnalyticsStats } from '@/widgets/analytics-dashboard';
import {
  BoxIcon,
  CategoriesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DollarIcon,
  EyeIcon,
  FilterIcon,
  GlobeIcon,
  LocationIcon,
  MessageIcon,
  PostsIcon,
  RefreshIcon,
  ShieldIcon,
  ShoppingIcon,
  TasksIcon,
  UserIcon,
  UsersIcon,
} from '@/shared/ui/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog';

type TrackObjectType =
  | 'user'
  | 'post'
  | 'product'
  | 'category'
  | 'comment'
  | 'space'
  | 'task'
  | 'payment'
  | 'session'
  | 'system';

type TrackActionType = 'create' | 'update' | 'remove' | 'search' | 'view' | 'disconnect';

interface ActivityFilters {
  user: string;
  ip: string;
  object: TrackObjectType | 'all';
  action: TrackActionType | 'all';
  dateFrom: string;
  dateTo: string;
}

interface ActivityItem {
  id: number;
  object: TrackObjectType;
  action: TrackActionType;
  user?: number;
  user_info?: {
    id?: number;
    login?: string;
    name?: string;
    surname?: string;
  };
  token?: string;
  ip?: string;
  created: number;
  params: Record<string, unknown>;
  context: Record<string, unknown>;
}

interface AdminActivityResponse {
  items: ActivityItem[];
  count: number;
}

const ACTIVITY_PAGE_SIZE = 20;

const DEFAULT_ACTIVITY_FILTERS: ActivityFilters = {
  user: '',
  ip: '',
  object: 'all',
  action: 'all',
  dateFrom: '',
  dateTo: '',
};

export default function AdminPage() {
  const t = useTranslations('admin.dashboard');
  const tSystem = useTranslations('system');
  const { error: showError } = useToastActions();
  const { stats, isLoading, fetchStats } = useAnalyticsStats();

  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityPage, setActivityPage] = useState(0);
  const [activityFilters, setActivityFilters] = useState<ActivityFilters>(DEFAULT_ACTIVITY_FILTERS);
  const [appliedActivityFilters, setAppliedActivityFilters] =
    useState<ActivityFilters>(DEFAULT_ACTIVITY_FILTERS);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const activityFetchingRef = useRef(false);
  const activityLastKeyRef = useRef<string | null>(null);
  const activityRequestIdRef = useRef(0);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const formatDateTime = useCallback((timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }, []);

  const activityObjectLabels = useMemo(
    () => ({
      user: t('activity.objects.user'),
      post: t('activity.objects.post'),
      product: t('activity.objects.product'),
      category: t('activity.objects.category'),
      comment: t('activity.objects.comment'),
      space: t('activity.objects.space'),
      task: t('activity.objects.task'),
      payment: t('activity.objects.payment'),
      session: t('activity.objects.session'),
      system: t('activity.objects.system'),
    }),
    [t]
  );

  const activityActionLabels = useMemo(
    () => ({
      create: t('activity.actions.create'),
      update: t('activity.actions.update'),
      remove: t('activity.actions.remove'),
      search: t('activity.actions.search'),
      view: t('activity.actions.view'),
      disconnect: t('activity.actions.disconnect'),
    }),
    [t]
  );

  const activitySourceLabels = useMemo(
    () => ({
      web: t('activity.sources.web'),
      api: t('activity.sources.api'),
      tg_bot: t('activity.sources.tgBot'),
      tma: t('activity.sources.tma'),
      direct: t('activity.sources.direct'),
    }),
    [t]
  );

  const activityObjectOptions = useMemo(
    () =>
      [
        { value: 'all', label: t('activity.filters.objectAll') },
        { value: 'user', label: activityObjectLabels.user },
        { value: 'post', label: activityObjectLabels.post },
        { value: 'product', label: activityObjectLabels.product },
        { value: 'category', label: activityObjectLabels.category },
        { value: 'comment', label: activityObjectLabels.comment },
        { value: 'space', label: activityObjectLabels.space },
        { value: 'task', label: activityObjectLabels.task },
        { value: 'payment', label: activityObjectLabels.payment },
        { value: 'session', label: activityObjectLabels.session },
        { value: 'system', label: activityObjectLabels.system },
      ] satisfies { value: ActivityFilters['object']; label: string }[],
    [activityObjectLabels, t]
  );

  const activityActionOptions = useMemo(
    () =>
      [
        { value: 'all', label: t('activity.filters.actionAll') },
        { value: 'create', label: activityActionLabels.create },
        { value: 'update', label: activityActionLabels.update },
        { value: 'remove', label: activityActionLabels.remove },
        { value: 'search', label: activityActionLabels.search },
        { value: 'view', label: activityActionLabels.view },
        { value: 'disconnect', label: activityActionLabels.disconnect },
      ] satisfies { value: ActivityFilters['action']; label: string }[],
    [activityActionLabels, t]
  );

  const getActivityVisuals = useCallback(
    (object: TrackObjectType) => {
      switch (object) {
        case 'user':
          return {
            icon: <UsersIcon size={16} />,
            accent: 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
          };
        case 'post':
          return {
            icon: <PostsIcon size={16} />,
            accent: 'bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
          };
        case 'product':
          return {
            icon: <ShoppingIcon size={16} />,
            accent: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
          };
        case 'category':
          return {
            icon: <CategoriesIcon size={16} />,
            accent: 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
          };
        case 'comment':
          return {
            icon: <MessageIcon size={16} />,
            accent: 'bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
          };
        case 'space':
          return {
            icon: <BoxIcon size={16} />,
            accent: 'bg-sky-500/15 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400',
          };
        case 'task':
          return {
            icon: <TasksIcon size={16} />,
            accent: 'bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
          };
        case 'payment':
          return {
            icon: <DollarIcon size={16} />,
            accent: 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
          };
        case 'session':
          return {
            icon: <ClockIcon size={16} />,
            accent: 'bg-zinc-500/15 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-300',
          };
        default:
          return {
            icon: <ShieldIcon size={16} />,
            accent: 'bg-slate-500/15 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300',
          };
      }
    },
    []
  );

  const buildActivityTitle = useCallback(
    (item: ActivityItem) =>
      `${activityActionLabels[item.action] ?? item.action} ${activityObjectLabels[item.object] ?? item.object
      }`,
    [activityActionLabels, activityObjectLabels]
  );

  const buildActivitySubtitle = useCallback(
    (item: ActivityItem) => {
      const parts: string[] = [];
      parts.push(item.user ? t('activity.meta.user', { id: item.user }) : t('activity.meta.guest'));

      if (item.ip) {
        parts.push(t('activity.meta.ip', { value: item.ip }));
      }

      const sourceKey = (item.context?.source as string | undefined) || 'direct';
      const sourceLabel =
        activitySourceLabels[sourceKey as keyof typeof activitySourceLabels] || sourceKey;
      parts.push(t('activity.meta.source', { value: sourceLabel }));

      return parts.join(' • ');
    },
    [activitySourceLabels, t]
  );

  const buildUserLabel = useCallback(
    (item: ActivityItem) => {
      const login =
        (item.user_info?.login ||
          (item.params?.login as string | undefined)?.trim())?.trim() || undefined;
      const name = item.user_info?.name || (item.params?.name as string | undefined) || undefined;
      const surname =
        item.user_info?.surname || (item.params?.surname as string | undefined) || undefined;
      const fullName = [name, surname].filter(Boolean).join(' ');

      const base =
        (login && `@${login.replace(/^@/, '')}`) ||
        (item.user ? `#${item.user}` : t('activity.meta.guest'));

      return fullName ? `${base} (${fullName})` : base;
    },
    [t]
  );

  const extractChanges = useCallback((item: ActivityItem) => {
    const raw = item.params?.changes;
    if (!raw || typeof raw !== 'object') return [];

    return Object.entries(raw as Record<string, { old: unknown; new: unknown }>)
      .map(([field, values]) => ({
        field,
        old: (values && (values as { old: unknown }).old) ?? null,
        new: (values && (values as { new: unknown }).new) ?? null,
      }))
      .filter((change) => change.old !== change.new);
  }, []);

  const formatValue = useCallback((value: unknown) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }, []);

  const buildActivityPayload = useCallback((page: number, filters: ActivityFilters) => {
    const payload: Record<string, unknown> = {
      limit: ACTIVITY_PAGE_SIZE,
      offset: page * ACTIVITY_PAGE_SIZE,
    };

    if (filters.user.trim()) {
      const parsedUser = Number(filters.user.trim());
      if (!Number.isNaN(parsedUser)) {
        payload.user = parsedUser;
      }
    }

    if (filters.ip.trim()) {
      payload.ip = filters.ip.trim();
    }

    if (filters.object !== 'all') {
      payload.object = filters.object;
    }

    if (filters.action !== 'all') {
      payload.action = filters.action;
    }

    if (filters.dateFrom) {
      payload.date_from = Math.floor(new Date(filters.dateFrom).getTime() / 1000);
    }

    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      payload.date_to = Math.floor(endDate.getTime() / 1000);
    }

    return payload;
  }, []);

  const fetchActivity = useCallback(
    async (page: number, filters: ActivityFilters) => {
      const payload = buildActivityPayload(page, filters);
      const requestKey = JSON.stringify(payload);

      if (activityFetchingRef.current && activityLastKeyRef.current === requestKey) {
        return;
      }

      const requestId = activityRequestIdRef.current + 1;
      activityRequestIdRef.current = requestId;
      activityFetchingRef.current = true;
      activityLastKeyRef.current = requestKey;

      setIsActivityLoading(true);
      try {
        const response = await api.post<AdminActivityResponse>(
          API_ENDPOINTS.ADMIN.ACTIVITY,
          payload,
          { suppressGlobalErrorHandler: true }
        );

        if (activityRequestIdRef.current !== requestId) {
          return;
        }

        setActivityItems(response.items ?? []);
        setActivityTotal(response.count ?? 0);
      } catch (error) {
        showError(t('activity.loadError'));
      } finally {
        if (activityRequestIdRef.current === requestId) {
          activityFetchingRef.current = false;
          setIsActivityLoading(false);
        }
      }
    },
    [buildActivityPayload, showError, t]
  );

  useEffect(() => {
    fetchActivity(activityPage, appliedActivityFilters);
  }, [activityPage, appliedActivityFilters, fetchActivity]);

  const activityPageCount = useMemo(
    () => Math.max(1, Math.ceil(activityTotal / ACTIVITY_PAGE_SIZE)),
    [activityTotal]
  );

  const handleFilterChange = useCallback((field: keyof ActivityFilters, value: string) => {
    setActivityFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    setActivityPage(0);
    setAppliedActivityFilters(activityFilters);
  }, [activityFilters]);

  const handleResetFilters = useCallback(() => {
    setActivityFilters(DEFAULT_ACTIVITY_FILTERS);
    setActivityPage(0);
    setAppliedActivityFilters(DEFAULT_ACTIVITY_FILTERS);
  }, []);

  const handlePageChange = useCallback(
    (direction: 'prev' | 'next') => {
      setActivityPage((prev) => {
        const nextPage = direction === 'next' ? prev + 1 : prev - 1;
        const maxPage = Math.max(0, activityPageCount - 1);

        if (nextPage < 0) return 0;
        if (nextPage > maxPage) return maxPage;
        return nextPage;
      });
    },
    [activityPageCount]
  );

  const isActivityEmpty = !activityItems.length && !isActivityLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<EyeIcon size={24} />}
        iconClassName="bg-muted text-foreground"
        title={tSystem('dashboard')}
        description={t('description')}
        actions={
          <IconButton
            icon={<RefreshIcon size={16} />}
            variant="outline"
            responsive
            onClick={fetchStats}
            disabled={isLoading}
          >
            {tSystem('refresh')}
          </IconButton>
        }
      />

      <AnalyticsStats stats={stats} isLoading={isLoading} />

      <Box size="lg" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{t('activity.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('activity.description')}</p>
          </div>
          <div className="flex items-center gap-2">
            <IconButton
              icon={<RefreshIcon size={16} />}
              variant="ghost"
              responsive
              onClick={() => fetchActivity(activityPage, appliedActivityFilters)}
              disabled={isActivityLoading}
            >
              {tSystem('refresh')}
            </IconButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('activity.filters.user')}
            </p>
            <Input
              type="number"
              inputMode="numeric"
              value={activityFilters.user}
              onChange={(event) => handleFilterChange('user', event.target.value)}
              placeholder={t('activity.filters.userPlaceholder')}
              className="cursor-pointer"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('activity.filters.ip')}
            </p>
            <Input
              value={activityFilters.ip}
              onChange={(event) => handleFilterChange('ip', event.target.value)}
              placeholder={t('activity.filters.ipPlaceholder')}
              className="cursor-pointer"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('activity.filters.object')}
            </p>
            <Select
              value={activityFilters.object}
              onValueChange={(value) => handleFilterChange('object', value)}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={t('activity.filters.objectPlaceholder')} />
              </SelectTrigger>
              <SelectContent align="end">
                {activityObjectOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('activity.filters.action')}
            </p>
            <Select
              value={activityFilters.action}
              onValueChange={(value) => handleFilterChange('action', value)}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={t('activity.filters.actionPlaceholder')} />
              </SelectTrigger>
              <SelectContent align="end">
                {activityActionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('activity.filters.dateFrom')}
            </p>
            <Input
              type="date"
              value={activityFilters.dateFrom}
              onChange={(event) => handleFilterChange('dateFrom', event.target.value)}
              className="cursor-pointer"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('activity.filters.dateTo')}
            </p>
            <Input
              type="date"
              value={activityFilters.dateTo}
              onChange={(event) => handleFilterChange('dateTo', event.target.value)}
              className="cursor-pointer"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <IconButton
            icon={<FilterIcon size={16} />}
            variant="default"
            responsive
            onClick={handleApplyFilters}
            disabled={isActivityLoading}
          >
            {t('activity.filters.apply')}
          </IconButton>
          <IconButton
            icon={<RefreshIcon size={16} />}
            variant="outline"
            responsive
            onClick={handleResetFilters}
            disabled={isActivityLoading}
          >
            {t('activity.filters.reset')}
          </IconButton>
        </div>

        <div className="space-y-2">
          {isActivityLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-[1rem] bg-muted/40 px-4 py-3 shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-[0.75rem] bg-muted/70 text-muted-foreground animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 w-40 rounded-[0.75rem] bg-muted/60 animate-pulse" />
                      <div className="h-3 w-64 rounded-[0.75rem] bg-muted/40 animate-pulse" />
                    </div>
                  </div>
                  <div className="h-3 w-24 rounded-[0.75rem] bg-muted/50 animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {!isActivityLoading && (
            <div className="divide-y divide-border/50 rounded-[1rem] bg-muted/20 px-2">
              {activityItems.map((item) => {
                const { icon, accent } = getActivityVisuals(item.object);
                const sourceKey = (item.context?.source as string | undefined) || 'direct';
                const sourceLabel =
                  activitySourceLabels[sourceKey as keyof typeof activitySourceLabels] || sourceKey;
                const ipValue = item.ip || (item.context?.ip as string | undefined);

                const metaItems = [
                  {
                    icon: <GlobeIcon size={12} />,
                    keyLabel: t('activity.meta.source', { value: sourceLabel }),
                    value: sourceLabel,
                  },
                  ipValue
                    ? {
                        icon: <LocationIcon size={12} />,
                        keyLabel: t('activity.filters.ip'),
                        value: ipValue,
                      }
                    : null,
                ].filter(Boolean) as {
                  icon: ReactNode;
                  keyLabel?: string;
                  value: ReactNode;
                }[];

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedActivity(item);
                      setIsDetailsOpen(true);
                    }}
                    className="block w-full text-left transition-colors duration-200 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                  >
                    <EntityRow
                      id={item.id}
                      title={buildActivityTitle(item)}
                      badges={[
                        <Badge key="user" variant="secondary" className="inline-flex items-center gap-1">
                          <UserIcon size={12} />
                          <span className="truncate max-w-[180px]">{buildUserLabel(item)}</span>
                        </Badge>,
                      ]}
                      secondRowItems={metaItems}
                      leftSlot={
                        <span
                          className={cn(
                            'inline-flex h-12 w-12 items-center justify-center rounded-[0.75rem] bg-muted text-muted-foreground',
                            accent
                          )}
                        >
                          {icon}
                        </span>
                      }
                      rightActions={
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ClockIcon size={14} />
                          <span>{formatDateTime(item.created)}</span>
                        </div>
                      }
                      className="py-3"
                    />
                  </button>
                );
              })}
            </div>
          )}

          {isActivityEmpty && (
            <div className="rounded-[1rem] bg-muted/30 px-4 py-4 text-sm text-muted-foreground shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.08)]">
              {t('activity.empty')}
            </div>
          )}
        </div>

        <Dialog
          open={isDetailsOpen}
          onOpenChange={(open) => {
            setIsDetailsOpen(open);
            if (!open) {
              setSelectedActivity(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-2xl">
            {selectedActivity && (
              <>
                <DialogTitle>{buildActivityTitle(selectedActivity)}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2">
                  <UserIcon size={14} />
                  <span>{buildUserLabel(selectedActivity)}</span>
                  <span className="text-xl text-muted-foreground">•</span>
                  <ClockIcon size={14} />
                  <span>{formatDateTime(selectedActivity.created)}</span>
                </DialogDescription>

                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2 rounded-[0.75rem] bg-muted px-2 py-1">
                    <GlobeIcon size={14} />
                    <span>
                      {activitySourceLabels[
                        ((selectedActivity.context?.source as string | undefined) || 'direct') as keyof typeof activitySourceLabels
                      ] ||
                        (selectedActivity.context?.source as string | undefined) ||
                        'direct'}
                    </span>
                  </span>
                  {Boolean(
                    (selectedActivity.ip as string | undefined) ||
                    (selectedActivity.context?.ip as string | undefined)
                  ) && (
                      <span className="inline-flex items-center gap-2 rounded-[0.75rem] bg-muted px-2 py-1">
                        <LocationIcon size={14} />
                        <span>
                          {(selectedActivity.ip as string) ||
                            (selectedActivity.context?.ip as string)}
                        </span>
                      </span>
                    )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">{t('activity.details.changes')}</p>
                  {extractChanges(selectedActivity).length ? (
                    <div className="overflow-hidden rounded-[1rem] bg-muted/30 shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.08)]">
                      <div className="grid grid-cols-[1.2fr_1fr_1fr] items-center gap-3 border-b border-border/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span>{t('activity.details.field')}</span>
                        <span>{t('activity.details.old')}</span>
                        <span>{t('activity.details.new')}</span>
                      </div>
                      <div className="divide-y divide-border/40">
                        {extractChanges(selectedActivity).map((change) => (
                          <div
                            key={change.field}
                            className="grid grid-cols-[1.2fr_1fr_1fr] items-start gap-3 px-4 py-2 text-sm"
                          >
                            <span className="font-medium text-foreground">{change.field}</span>
                            <span className="break-all text-muted-foreground">{formatValue(change.old)}</span>
                            <span className="break-all text-foreground">{formatValue(change.new)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[0.75rem] bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                      {t('activity.details.noChanges')}
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {t('activity.pagination.label', { page: activityPage + 1, total: activityPageCount })}
          </p>
          <div className="flex items-center gap-2">
            <IconButton
              icon={<ChevronLeftIcon size={14} />}
              variant="outline"
              responsive
              onClick={() => handlePageChange('prev')}
              disabled={isActivityLoading || activityPage === 0}
            >
              {t('activity.pagination.prev')}
            </IconButton>
            <IconButton
              icon={<ChevronRightIcon size={14} />}
              variant="outline"
              responsive
              onClick={() => handlePageChange('next')}
              disabled={
                isActivityLoading || activityPage + 1 >= activityPageCount || isActivityEmpty
              }
            >
              {t('activity.pagination.next')}
            </IconButton>
          </div>
        </div>
      </Box>
    </div>
  );
}
