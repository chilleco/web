'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { API_ENDPOINTS } from '@/shared/constants';
import { api } from '@/shared/services/api/client';
import { useToastActions } from '@/shared/hooks/useToast';
import { cn } from '@/shared/lib/utils';
import { Box } from '@/shared/ui/box';
import { IconButton } from '@/shared/ui/icon-button';
import { Input } from '@/shared/ui/input';
import { PageHeader } from '@/shared/ui/page-header';
import {
  BoxIcon,
  CategoriesIcon,
  ChartIcon,
  CheckIcon,
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

interface AdminStats {
  users: number;
  posts: number;
  products: number;
  payments?: number;
  visits?: number;
  tasks?: number;
}

type TrackObjectType =
  | 'user'
  | 'post'
  | 'product'
  | 'category'
  | 'comment'
  | 'space'
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

interface StatCardProps {
  title: string;
  subtitle: string;
  value: string;
  icon: ReactNode;
  accentClassName: string;
  isLoading: boolean;
}

function StatCard({ title, subtitle, value, icon, accentClassName, isLoading }: StatCardProps) {
  return (
    <Box size="default" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-[0.75rem] bg-muted text-muted-foreground p-2',
            accentClassName
          )}
        >
          {icon}
        </span>
        <h3 className="text-lg font-semibold leading-none">{title}</h3>
      </div>

      <div className="flex flex-col gap-1">
        {isLoading ? (
          <div className="h-9 w-24 animate-pulse rounded-[0.75rem] bg-muted/60" />
        ) : (
          <p className="text-3xl font-bold leading-none text-primary">{value}</p>
        )}
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </Box>
  );
}

export default function AdminPage() {
  const locale = useLocale();
  const t = useTranslations('admin.dashboard');
  const tSystem = useTranslations('system');
  const tNav = useTranslations('navigation');
  const { error: showError } = useToastActions();

  const [stats, setStats] = useState<AdminStats>({
    users: 0,
    posts: 0,
    products: 0,
    payments: 0,
    visits: 0,
    tasks: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const statsFetchingRef = useRef(false);
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

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumSignificantDigits: 1,
        maximumSignificantDigits: 2,
      }),
    [locale]
  );
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }),
    [locale]
  );
  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: 'short',
        year: 'numeric',
      }),
    [locale]
  );

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

  const funnelStages = useMemo(() => {
    const seed = [
      { key: 'visit', count: 12000 },
      { key: 'registration', count: 4200 },
      { key: 'dataSubmission', count: 2800 },
      { key: 'engagement', count: 1900 },
      { key: 'taskCompletion', count: 1400 },
      { key: 'referralInvite', count: 900 },
      { key: 'returningVisit', count: 600 },
      { key: 'purchase', count: 500 },
      { key: 'repeatPurchase', count: 220 },
    ];

    const firstCount = seed[0]?.count || 1;

    return seed.map((stage, index) => {
      const prevCount = index === 0 ? stage.count || 1 : seed[index - 1].count || 1;
      const relativeFirst = firstCount ? (stage.count / firstCount) * 100 : 0;
      const relativePrev = prevCount ? (stage.count / prevCount) * 100 : 0;

      return {
        ...stage,
        relativeFirst,
        relativePrev,
      };
    });
  }, []);

  const stageMap = useMemo(
    () => Object.fromEntries(funnelStages.map((stage) => [stage.key, stage])),
    [funnelStages]
  );

  const ratioFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      }),
    [locale]
  );

  const referralConversion = useMemo(() => {
    const referral = stageMap.referralInvite?.count || 0;
    const registration = stageMap.registration?.count || 0;
    return registration ? (referral / registration) * 100 : 0;
  }, [stageMap]);

  const averageReferralsPerReferrer = 3;
  const referralRate = (referralConversion / 100) * averageReferralsPerReferrer;

  const conversionToPayment = useMemo(() => {
    const payments = stageMap.purchase?.count || 0;
    const visits = stageMap.visit?.count || 0;
    return visits ? (payments / visits) * 100 : 0;
  }, [stageMap]);

  const averageReceipt = 10;
  const pricePerLead = 1;
  const economyRate = pricePerLead
    ? (averageReceipt * (conversionToPayment / 100)) / pricePerLead
    : 0;

  const getZoneClass = useCallback((value: number) => {
    if (value > 1) {
      return 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400';
    }
    if (Math.abs(value - 1) < 0.0001) {
      return 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400';
    }
    return 'bg-red-500/15 text-red-600 dark:bg-red-500/20 dark:text-red-400';
  }, []);

  const formulaRows = useMemo(
    () => [
      {
        key: 'referral',
        operators: ['×', '', '='],
        blocks: [
          {
            key: 'conversion',
            label: t('funnel.formulas.referral.conversion'),
            value: percentFormatter.format(referralConversion / 100),
          },
          {
            key: 'avgReferrals',
            label: t('funnel.formulas.referral.avgReferrals'),
            value: ratioFormatter.format(averageReferralsPerReferrer),
          },
          {
            key: 'placeholder',
            label: '\u00A0',
            value: '\u00A0',
            placeholder: true,
          },
          {
            key: 'result',
            label: t('funnel.formulas.referral.result'),
            value: ratioFormatter.format(referralRate),
            highlightClass: getZoneClass(referralRate),
          },
        ],
      },
      {
        key: 'economy',
        operators: ['×', '/', '='],
        blocks: [
          {
            key: 'averageReceipt',
            label: t('funnel.formulas.economy.averageReceipt'),
            value: currencyFormatter.format(averageReceipt),
          },
          {
            key: 'visitToPayment',
            label: t('funnel.formulas.economy.visitToPayment'),
            value: percentFormatter.format(conversionToPayment / 100),
          },
          {
            key: 'pricePerLead',
            label: t('funnel.formulas.economy.pricePerLead'),
            value: currencyFormatter.format(pricePerLead),
          },
          {
            key: 'result',
            label: t('funnel.formulas.economy.result'),
            value: ratioFormatter.format(economyRate),
            highlightClass: getZoneClass(economyRate),
          },
        ],
      },
    ],
    [
      conversionToPayment,
      currencyFormatter,
      economyRate,
      getZoneClass,
      percentFormatter,
      pricePerLead,
      referralConversion,
      referralRate,
      ratioFormatter,
      t,
    ]
  );

  const retentionRows = useMemo(() => {
    const seed = [
      { start: '2024-01-01', cohort: 1200, retention: [100, 72, 61, 49, 38, 28] },
      { start: '2024-02-01', cohort: 1100, retention: [100, 70, 58, 47, 35, 26] },
      { start: '2024-03-01', cohort: 980, retention: [100, 68, 55, 44, 33, 24] },
      { start: '2024-04-01', cohort: 1020, retention: [100, 66, 53, 41, 30, 22] },
      { start: '2024-05-01', cohort: 890, retention: [100, 64, 51, 39, 28, 20] },
    ];

    return seed.map((row) => ({
      ...row,
      label: monthFormatter.format(new Date(row.start)),
    }));
  }, [monthFormatter]);

  const fetchStats = useCallback(async () => {
    if (statsFetchingRef.current) return;

    statsFetchingRef.current = true;
    setIsLoading(true);
    try {
      const response = await api.post<AdminStats>(
        API_ENDPOINTS.ADMIN.STATS,
        {},
        { suppressGlobalErrorHandler: true }
      );

      setStats({
        users: response.users ?? 0,
        posts: response.posts ?? 0,
        products: response.products ?? 0,
        payments: response.payments ?? 0,
        visits: response.visits ?? 0,
        tasks: response.tasks ?? 0,
      });
    } catch (error) {
      showError(t('loadError'));
    } finally {
      statsFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [showError, t]);

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
    fetchStats();
  }, [fetchStats]);

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

  const statCards = useMemo(
    () => [
      {
        key: 'visits',
        title: t('cards.visits'),
        subtitle: t('cards.visitsSubtitle'),
        value: stats.visits ? numberFormatter.format(stats.visits) : '–',
        icon: <EyeIcon size={20} />,
        accentClassName: 'bg-sky-500/15 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400',
      },
      {
        key: 'users',
        title: tSystem('users'),
        subtitle: t('cards.users'),
        value: numberFormatter.format(stats.users ?? 0),
        icon: <UsersIcon size={20} />,
        accentClassName: 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
      },
      {
        key: 'payments',
        title: t('cards.payments'),
        subtitle: t('cards.paymentsSubtitle'),
        value: numberFormatter.format(stats.payments ?? 0),
        icon: <DollarIcon size={20} />,
        accentClassName: 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
      },
      {
        key: 'posts',
        title: tNav('posts'),
        subtitle: t('cards.posts'),
        value: numberFormatter.format(stats.posts ?? 0),
        icon: <PostsIcon size={20} />,
        accentClassName: 'bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
      },
      {
        key: 'products',
        title: tNav('products'),
        subtitle: t('cards.products'),
        value: numberFormatter.format(stats.products ?? 0),
        icon: <ShoppingIcon size={20} />,
        accentClassName:
          'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
      },
      {
        key: 'tasks',
        title: t('cards.tasks'),
        subtitle: t('cards.tasksSubtitle'),
        value: stats.tasks ? numberFormatter.format(stats.tasks) : '–',
        icon: <CheckIcon size={20} />,
        accentClassName: 'bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
      },
    ],
    [
      numberFormatter,
      stats.payments,
      stats.posts,
      stats.products,
      stats.tasks,
      stats.users,
      stats.visits,
      t,
      tNav,
      tSystem,
    ]
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {statCards.map((card) => (
          <StatCard
            key={card.key}
            title={card.title}
            subtitle={card.subtitle}
            value={card.value}
            icon={card.icon}
            accentClassName={card.accentClassName}
            isLoading={isLoading}
          />
        ))}
      </div>

      <Box size="lg" className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center rounded-[0.75rem] bg-purple-500/15 p-2 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
            <ChartIcon size={18} />
          </span>
          <div>
            <h2 className="text-xl font-semibold">{t('funnel.formulas.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('funnel.formulas.subtitle')}</p>
          </div>
        </div>

        <div className="space-y-4">
          {formulaRows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2 md:gap-3"
            >
              {row.blocks.map((block, idx) => (
                <Fragment key={block.key}>
                  <div
                    className={cn(
                      'flex min-h-[96px] flex-col items-center justify-center rounded-[0.75rem] bg-muted/50 px-3 py-3 text-center shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.08)]',
                      block.placeholder && 'opacity-0'
                    )}
                  >
                    <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      {block.label}
                    </span>
                    <span
                      className={cn(
                        'mt-1 rounded-[0.65rem] px-2 py-1 text-xl font-bold leading-tight',
                        block.highlightClass
                      )}
                    >
                      {block.value}
                    </span>
                  </div>
                  {idx < row.blocks.length - 1 && (
                    <div className="flex h-full min-w-[28px] items-center justify-center text-lg font-semibold text-muted-foreground">
                      {row.operators[idx]}
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          ))}
        </div>
      </Box>

      <Box size="lg" className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center rounded-[0.75rem] bg-blue-500/15 p-2 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
            <FilterIcon size={18} />
          </span>
          <div>
            <h2 className="text-xl font-semibold">{t('funnel.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('funnel.subtitle')}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[720px] space-y-2">
            <div className="grid grid-cols-[minmax(140px,_0.9fr)_minmax(0,_2.4fr)_repeat(2,minmax(90px,_0.9fr))] items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span />
              <span className="text-center">{t('funnel.table.amount')}</span>
              <span className="text-right">{t('funnel.table.absolute')}</span>
              <span className="text-right">{t('funnel.table.relative')}</span>
            </div>

            <div className="space-y-2">
              {funnelStages.map((stage) => {
                const label = t(`funnel.stages.${stage.key}`);
                const width = Math.max(Math.min(stage.relativeFirst, 100), 5);

                return (
                  <div
                    key={stage.key}
                    className="grid grid-cols-[minmax(140px,_0.9fr)_minmax(0,_2.4fr)_repeat(2,minmax(90px,_0.9fr))] items-center gap-3"
                  >
                    <span className="text-sm font-semibold text-foreground">{label}</span>

                    <div className="relative h-12 w-full overflow-hidden rounded-[1rem] bg-muted/30 shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)]">
                      <div
                        className="absolute top-0 flex h-full items-center justify-center bg-foreground text-background text-sm font-semibold transition-all duration-500"
                        style={{
                          width: `${width}%`,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          borderRadius: '1rem',
                        }}
                      >
                        <span className="text-xs font-semibold">
                          {numberFormatter.format(stage.count)}
                        </span>
                      </div>
                    </div>

                    <span className="text-right text-sm text-muted-foreground">
                      {percentFormatter.format(stage.relativeFirst / 100)}
                    </span>
                    <span className="text-right text-sm text-muted-foreground">
                      {percentFormatter.format(stage.relativePrev / 100)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Box>

      <Box size="lg" className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center rounded-[0.75rem] bg-emerald-500/15 p-2 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <UsersIcon size={18} />
          </span>
          <div>
            <h2 className="text-xl font-semibold">{t('funnel.retention.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('funnel.retention.subtitle')}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[820px] space-y-2">
            <div className="grid grid-cols-[minmax(140px,_1.2fr)_minmax(120px,_1fr)_repeat(6,minmax(70px,_0.7fr))] items-center gap-3 rounded-[1rem] bg-muted/40 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.08)]">
              <span>{t('funnel.retention.month')}</span>
              <span className="text-center">{t('funnel.retention.cohort')}</span>
              <span className="text-center">{t('funnel.retention.m1')}</span>
              <span className="text-center">{t('funnel.retention.m2')}</span>
              <span className="text-center">{t('funnel.retention.m3')}</span>
              <span className="text-center">{t('funnel.retention.m4')}</span>
              <span className="text-center">{t('funnel.retention.m5')}</span>
              <span className="text-center">{t('funnel.retention.m6')}</span>
            </div>

            <div className="space-y-2">
              {retentionRows.map((row) => (
                <div
                  key={row.start}
                  className="grid grid-cols-[minmax(140px,_1.2fr)_minmax(120px,_1fr)_repeat(6,minmax(70px,_0.7fr))] items-center gap-3 rounded-[1rem] bg-muted/30 px-4 py-3 shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.08)]"
                >
                  <span className="text-sm font-semibold text-foreground">{row.label}</span>
                  <span className="text-center text-sm font-semibold text-foreground">
                    {numberFormatter.format(row.cohort)}
                  </span>
                  {row.retention.map((value, idx) => (
                    <span key={idx} className="text-center text-sm text-muted-foreground">
                      {percentFormatter.format(value / 100)}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Box>

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

          {!isActivityLoading &&
            activityItems.map((item) => {
              const { icon, accent } = getActivityVisuals(item.object);
              const sourceKey = (item.context?.source as string | undefined) || 'direct';
              const sourceLabel =
                activitySourceLabels[sourceKey as keyof typeof activitySourceLabels] || sourceKey;
              const ipValue = item.ip || (item.context?.ip as string | undefined);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedActivity(item);
                    setIsDetailsOpen(true);
                  }}
                  className="flex w-full items-center justify-between rounded-[1rem] bg-muted/40 px-4 py-3 text-left shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)] transition-all duration-200 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                >
                  <div className="flex flex-1 items-start gap-3">
                    <span
                      className={cn(
                        'inline-flex size-10 items-center justify-center rounded-[0.75rem] bg-muted text-muted-foreground',
                        accent
                      )}
                    >
                      {icon}
                    </span>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                          <UserIcon size={14} />
                          <span>{buildUserLabel(item)}</span>
                        </span>
                        <span className="text-xl text-muted-foreground">•</span>
                        <span className="text-base font-semibold leading-tight text-foreground">
                          {buildActivityTitle(item)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2 rounded-[0.75rem] bg-muted/60 px-2 py-1">
                          <GlobeIcon size={14} />
                          <span>{sourceLabel}</span>
                        </span>
                        {ipValue && (
                          <span className="inline-flex items-center gap-2 rounded-[0.75rem] bg-muted/60 px-2 py-1">
                            <LocationIcon size={14} />
                            <span>{ipValue}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ClockIcon size={14} />
                    <span>{formatDateTime(item.created)}</span>
                  </div>
                </button>
              );
            })}

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
