'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, type ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { Box } from '@/shared/ui/box';
import {
  CheckIcon,
  DollarIcon,
  EyeIcon,
  PostsIcon,
  ShoppingIcon,
  UsersIcon,
} from '@/shared/ui/icons';
import { AdminStats } from '../model/types';

interface AnalyticsStatsProps {
  stats: AdminStats;
  isLoading: boolean;
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

export function AnalyticsStats({ stats, isLoading }: AnalyticsStatsProps) {
  const locale = useLocale();
  const t = useTranslations('admin.dashboard');
  const tSystem = useTranslations('system');
  const tNav = useTranslations('navigation');

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const statCards = useMemo(
    () => [
      {
        key: 'visits',
        title: t('cards.visits'),
        subtitle: t('cards.visitsSubtitle'),
        value: stats.visits ? numberFormatter.format(stats.visits) : '–',
        icon: <EyeIcon size={20} />,
        accentClassName: 'bg-[var(--bg-blue)] text-[var(--font-blue)]',
      },
      {
        key: 'users',
        title: tSystem('users'),
        subtitle: t('cards.users'),
        value: numberFormatter.format(stats.users ?? 0),
        icon: <UsersIcon size={20} />,
        accentClassName: 'bg-[var(--bg-blue)] text-[var(--font-blue)]',
      },
      {
        key: 'payments',
        title: t('cards.payments'),
        subtitle: t('cards.paymentsSubtitle'),
        value: numberFormatter.format(stats.payments ?? 0),
        icon: <DollarIcon size={20} />,
        accentClassName: 'bg-[var(--bg-yellow)] text-[var(--font-yellow)]',
      },
      {
        key: 'posts',
        title: tNav('posts'),
        subtitle: t('cards.posts'),
        value: numberFormatter.format(stats.posts ?? 0),
        icon: <PostsIcon size={20} />,
        accentClassName: 'bg-[var(--bg-violet)] text-[var(--font-violet)]',
      },
      {
        key: 'products',
        title: tNav('products'),
        subtitle: t('cards.products'),
        value: numberFormatter.format(stats.products ?? 0),
        icon: <ShoppingIcon size={20} />,
        accentClassName:
          'bg-[var(--bg-green)] text-[var(--font-green)]',
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
    [numberFormatter, stats.payments, stats.posts, stats.products, stats.tasks, stats.users, stats.visits, t, tNav, tSystem]
  );

  return (
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
  );
}
