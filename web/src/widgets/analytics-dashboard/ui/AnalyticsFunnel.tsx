'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Box } from '@/shared/ui/box';
import { FilterIcon } from '@/shared/ui/icons';
import { useFunnelStages } from '../model/useFunnelStages';

export function AnalyticsFunnel() {
  const locale = useLocale();
  const t = useTranslations('admin.dashboard');
  const { stages } = useFunnelStages();

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

  return (
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
            {stages.map((stage) => {
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
  );
}
