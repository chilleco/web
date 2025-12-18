'use client';

import { Fragment, useCallback, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/shared/lib/utils';
import { Box } from '@/shared/ui/box';
import { ChartIcon } from '@/shared/ui/icons';
import { useFunnelStages } from '../model/useFunnelStages';

export function AnalyticsFormulas() {
  const locale = useLocale();
  const t = useTranslations('admin.dashboard');
  const { stageMap } = useFunnelStages();

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
      return 'bg-[var(--bg-green)] text-[var(--font-green)]';
    }
    if (Math.abs(value - 1) < 0.0001) {
      return 'bg-[var(--bg-yellow)] text-[var(--font-yellow)]';
    }
    return 'bg-[var(--bg-red)] text-[var(--font-red)]';
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

  return (
    <Box size="lg" className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center rounded-[0.75rem] bg-[var(--bg-violet)] p-2 text-[var(--font-violet)]">
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
  );
}
