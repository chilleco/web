'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { API_ENDPOINTS } from '@/shared/constants';
import { api } from '@/shared/services/api/client';
import { useToastActions } from '@/shared/hooks/useToast';
import { AdminStats } from './types';

const DEFAULT_STATS: AdminStats = {
  users: 0,
  posts: 0,
  products: 0,
  payments: 0,
  visits: 0,
  tasks: 0,
};

export function useAnalyticsStats() {
  const t = useTranslations('admin.dashboard');
  const { error: showError } = useToastActions();
  const [stats, setStats] = useState<AdminStats>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const fetchingRef = useRef(false);

  const fetchStats = useCallback(async () => {
    if (fetchingRef.current) return;

    fetchingRef.current = true;
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
      fetchingRef.current = false;
      setIsLoading(false);
    }
  }, [showError, t]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    fetchStats,
  };
}
