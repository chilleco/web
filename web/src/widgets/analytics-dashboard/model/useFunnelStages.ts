'use client';

import { useMemo } from 'react';
import { FunnelStage } from './types';

export function useFunnelStages() {
  const stages = useMemo<FunnelStage[]>(() => {
    const seed: Pick<FunnelStage, 'key' | 'count'>[] = [
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
    () => Object.fromEntries(stages.map((stage) => [stage.key, stage])),
    [stages]
  );

  return {
    stages,
    stageMap,
  };
}
