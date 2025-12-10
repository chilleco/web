'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Box } from '@/shared/ui/box';
import { PageHeader } from '@/shared/ui/page-header';
import { IconButton } from '@/shared/ui/icon-button';
import {
  FilterIcon,
  PostsIcon,
  RefreshIcon,
  ShoppingIcon,
  UsersIcon,
  ClockIcon,
  ChartIcon,
  EyeIcon,
  DollarIcon,
  CheckIcon,
} from '@/shared/ui/icons';
import { API_ENDPOINTS } from '@/shared/constants';
import { api } from '@/shared/services/api/client';
import { useToastActions } from '@/shared/hooks/useToast';
import { cn } from '@/shared/lib/utils';

interface AdminStats {
  users: number;
  posts: number;
  products: number;
  payments?: number;
  visits?: number;
  tasks?: number;
}

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
  const isFetchingRef = useRef(false);

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
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
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
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [showError, t]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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

  const activityItems = useMemo(
    () => [
      {
        key: 'userRegistered',
        title: t('activity.userRegistered.title'),
        subtitle: t('activity.userRegistered.subtitle'),
        time: t('activity.time.hoursAgo', { value: 2 }),
        icon: <UsersIcon size={16} />,
        accent: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
      },
      {
        key: 'postPublished',
        title: t('activity.postPublished.title'),
        subtitle: t('activity.postPublished.subtitle'),
        time: t('activity.time.hoursAgo', { value: 4 }),
        icon: <PostsIcon size={16} />,
        accent: 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
      },
      {
        key: 'productUpdated',
        title: t('activity.productUpdated.title'),
        subtitle: t('activity.productUpdated.subtitle'),
        time: t('activity.time.dayAgo'),
        icon: <ShoppingIcon size={16} />,
        accent: 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
      },
    ],
    [t]
  );

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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t('activity.title')}</h2>
        </div>
        <div className="space-y-2">
          {activityItems.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between rounded-[1rem] bg-muted/40 px-4 py-3 shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)]"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'inline-flex size-10 items-center justify-center rounded-[0.75rem] bg-muted text-muted-foreground',
                    item.accent
                  )}
                >
                  {item.icon}
                </span>
                <div className="space-y-1">
                  <p className="font-medium leading-tight">{item.title}</p>
                  <p className="text-sm text-muted-foreground leading-tight">{item.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ClockIcon size={14} />
                <span>{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </Box>
    </div>
  );
}
