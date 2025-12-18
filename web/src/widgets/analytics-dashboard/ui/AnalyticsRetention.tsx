'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Box } from '@/shared/ui/box';
import { UsersIcon } from '@/shared/ui/icons';

export function AnalyticsRetention() {
  const locale = useLocale();
  const t = useTranslations('admin.dashboard');

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
  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: 'short',
        year: 'numeric',
      }),
    [locale]
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

  return (
    <Box size="lg" className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center rounded-[0.75rem] bg-[var(--bg-green)] p-2 text-[var(--font-green)]">
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
  );
}
