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

  return useCallback((error: unknown, fallbackMessage?: string) => {
    const apiError = error instanceof ApiError ? error : null;
    const detail = apiError?.data && typeof apiError.data === 'object'
      ? (apiError.data as { detail?: unknown }).detail
      : undefined;

    const detailMessage = normalizeMessage(detail);
    const baseMessage = normalizeMessage(detailMessage || apiError?.message || (error instanceof Error ? error.message : undefined));
    const fallback = fallbackMessage || tSystem('server_error');

    if (!baseMessage) {
      return fallback;
    }

    const hint = isUnsupportedImageMessage(detailMessage || baseMessage)
      ? tSystem('errors.unsupportedImageFormat')
      : undefined;

    return hint ? `${baseMessage} — ${hint}` : baseMessage;
  }, [tSystem]);
}
