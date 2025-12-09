'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Box } from '@/shared/ui/box';
import { PageHeader } from '@/shared/ui/page-header';
import { IconButton } from '@/shared/ui/icon-button';
import { AdminIcon, FilterIcon, PostsIcon, RefreshIcon, ShoppingIcon, UsersIcon } from '@/shared/ui/icons';
import { API_ENDPOINTS } from '@/shared/constants';
import { api } from '@/shared/services/api/client';
import { useToastActions } from '@/shared/hooks/useToast';
import { cn } from '@/shared/lib/utils';

interface AdminStats {
  users: number;
  posts: number;
  products: number;
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

  const [stats, setStats] = useState<AdminStats>({ users: 0, posts: 0, products: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const isFetchingRef = useRef(false);

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }),
    [locale]
  );

  const funnelStages = useMemo(() => {
    const seed = [
      { key: 'websiteVisit', count: 12000 },
      { key: 'registration', count: 4200 },
      { key: 'dataSubmission', count: 2800 },
      { key: 'engagement', count: 1900 },
      { key: 'returningVisit', count: 1100 },
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
        key: 'users',
        title: tSystem('users'),
        subtitle: t('cards.users'),
        value: numberFormatter.format(stats.users ?? 0),
        icon: <UsersIcon size={20} />,
        accentClassName: 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
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
    ],
    [numberFormatter, stats.posts, stats.products, stats.users, t, tNav, tSystem]
  );

  const activityItems = useMemo(
    () => [
      {
        key: 'userRegistered',
        title: t('activity.userRegistered.title'),
        subtitle: t('activity.userRegistered.subtitle'),
        time: t('activity.time.hoursAgo', { value: 2 }),
      },
      {
        key: 'postPublished',
        title: t('activity.postPublished.title'),
        subtitle: t('activity.postPublished.subtitle'),
        time: t('activity.time.hoursAgo', { value: 4 }),
      },
      {
        key: 'productUpdated',
        title: t('activity.productUpdated.title'),
        subtitle: t('activity.productUpdated.subtitle'),
        time: t('activity.time.dayAgo'),
      },
    ],
    [t]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<AdminIcon size={24} />}
        iconClassName="bg-red-500/15 text-red-600 dark:bg-red-500/20 dark:text-red-400"
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
          <span className="inline-flex items-center justify-center rounded-[0.75rem] bg-blue-500/15 p-2 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
            <FilterIcon size={18} />
          </span>
          <div>
            <h2 className="text-xl font-semibold">{t('funnel.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('funnel.subtitle')}</p>
          </div>
        </div>

        <div className="space-y-2">
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
                      className="absolute top-0 flex h-full items-center justify-center bg-foreground/20 text-sm font-semibold text-foreground transition-all duration-500 dark:bg-white/20"
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
      </Box>

      <Box size="lg" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t('activity.title')}</h2>
        </div>
        <div className="space-y-3">
          {activityItems.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between rounded-[0.75rem] bg-muted/50 px-4 py-3"
            >
              <div className="space-y-1">
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.subtitle}</p>
              </div>
              <span className="text-sm text-muted-foreground">{item.time}</span>
            </div>
          ))}
        </div>
      </Box>
    </div>
  );
}
