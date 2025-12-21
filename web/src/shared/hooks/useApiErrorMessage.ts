'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/services/api/client';

const normalizeMessage = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return undefined;
  }

  return String(value);
};

const isUnsupportedImageMessage = (message?: string) => {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes('cannot identify image') || normalized.includes('image file is truncated') || normalized.includes('heic');
};

export function useApiErrorMessage() {
  const tSystem = useTranslations('system');
  const tNavigation = useTranslations('navigation');

  return useCallback((error: unknown, fallbackMessage?: string) => {
    const apiError = error instanceof ApiError ? error : null;
    const data = apiError?.data && typeof apiError.data === 'object'
      ? (apiError.data as { detail?: unknown; error?: unknown })
      : undefined;
    const detail = data?.detail;
    const errorCode = typeof data?.error === 'string' ? data.error : undefined;

    const detailMessage = normalizeMessage(detail);
    const baseMessage = normalizeMessage(detailMessage || apiError?.message || (error instanceof Error ? error.message : undefined));
    const fallback = fallbackMessage || tSystem('server_error');

    if (errorCode === 'ErrorAccess') {
      const accessLabels: Record<string, string> = {
        tasks: tNavigation('tasks'),
        posts: tNavigation('posts'),
        products: tNavigation('products'),
        feedback: tNavigation('feedback'),
        categories: tSystem('categories'),
        spaces: tSystem('spaces'),
        users: tSystem('users'),
      };

      const normalizedDetail = detailMessage?.toLowerCase();
      const accessLabel = normalizedDetail ? accessLabels[normalizedDetail] : undefined;
      const itemLabel = accessLabel || detailMessage;
      if (itemLabel) {
        return tSystem('no_access_to', { item: itemLabel });
      }
      return tSystem('no_access');
    }

    if (!baseMessage) {
      return fallback;
    }

    const hint = isUnsupportedImageMessage(detailMessage || baseMessage)
      ? tSystem('errors.unsupportedImageFormat')
      : undefined;

    return hint ? `${baseMessage} — ${hint}` : baseMessage;
  }, [tNavigation, tSystem]);
}
