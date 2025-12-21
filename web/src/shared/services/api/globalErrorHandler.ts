'use client';

import { toast } from 'sonner';
import { ApiError } from './client';
import messagesEn from '../../../../messages/en.json';
import messagesRu from '../../../../messages/ru.json';
import messagesEs from '../../../../messages/es.json';
import messagesAr from '../../../../messages/ar.json';
import messagesZh from '../../../../messages/zh.json';

interface GlobalApiErrorHandlerOptions {
  enableToasts?: boolean;
  suppressDefaultToasts?: boolean;
  customErrorHandler?: (error: unknown) => void;
}

let globalOptions: GlobalApiErrorHandlerOptions = {
  enableToasts: true,
  suppressDefaultToasts: false
};

type Locale = 'en' | 'ru' | 'es' | 'ar' | 'zh';
type MessageMap = Record<string, unknown>;

const messagesByLocale: Record<Locale, MessageMap> = {
  en: messagesEn as MessageMap,
  ru: messagesRu as MessageMap,
  es: messagesEs as MessageMap,
  ar: messagesAr as MessageMap,
  zh: messagesZh as MessageMap,
};

const readCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
};

const resolveLocale = (): Locale => {
  if (typeof window === 'undefined') return 'en';
  let stored: string | null = null;
  try {
    stored = localStorage.getItem('userLanguage');
  } catch {
    stored = null;
  }
  const cookieLocale = readCookie('NEXT_LOCALE');
  const navigatorLocale = navigator.language?.split('-')[0];
  const candidate = stored || cookieLocale || navigatorLocale;
  if (candidate && candidate in messagesByLocale) {
    return candidate as Locale;
  }
  return 'en';
};

const getMessageValue = (messages: MessageMap, key: string): unknown => {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[part];
  }, messages);
};

const formatMessage = (template: string, values?: Record<string, string>): string => {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`);
};

const getLocalizedMessage = (key: string, values?: Record<string, string>): string => {
  const locale = resolveLocale();
  const messages = messagesByLocale[locale] ?? messagesByLocale.en;
  const raw = getMessageValue(messages, key) ?? getMessageValue(messagesByLocale.en, key);
  if (typeof raw === 'string') {
    return formatMessage(raw, values);
  }
  return key;
};

const accessLabelKeys: Record<string, { scope: 'navigation' | 'system'; key: string }> = {
  tasks: { scope: 'navigation', key: 'tasks' },
  posts: { scope: 'navigation', key: 'posts' },
  products: { scope: 'navigation', key: 'products' },
  feedback: { scope: 'navigation', key: 'feedback' },
  categories: { scope: 'system', key: 'categories' },
  spaces: { scope: 'system', key: 'spaces' },
  users: { scope: 'system', key: 'users' },
};

const resolveAccessMessage = (detail?: string): string => {
  const normalized = detail?.trim().toLowerCase();
  const labelKey = normalized ? accessLabelKeys[normalized] : undefined;
  const label = labelKey ? getLocalizedMessage(`${labelKey.scope}.${labelKey.key}`) : undefined;
  const itemLabel = label || detail;
  if (itemLabel) {
    return getLocalizedMessage('system.no_access_to', { item: itemLabel });
  }
  return getLocalizedMessage('system.no_access');
};

const TOAST_DEDUP_MS = 1500;
let lastToast: { message: string; endpoint?: string; ts: number } | null = null;

function shouldShowToast(message: string, endpoint?: string) {
  const now = Date.now();
  if (
    lastToast &&
    lastToast.message === message &&
    lastToast.endpoint === endpoint &&
    now - lastToast.ts < TOAST_DEDUP_MS
  ) {
    return false;
  }

  lastToast = { message, endpoint, ts: now };
  return true;
}

/**
 * Configure global API error handling behavior
 */
export function configureGlobalApiErrorHandler(options: GlobalApiErrorHandlerOptions) {
  globalOptions = { ...globalOptions, ...options };
}

/**
 * Get current global error handling configuration
 */
export function getGlobalApiErrorConfig(): GlobalApiErrorHandlerOptions {
  return { ...globalOptions };
}

/**
 * Handle API errors globally with toast notifications
 * This function should be called from the main API client
 */
export function handleGlobalApiError(error: unknown, endpoint?: string): never {
  // Custom error handler takes precedence
  if (globalOptions.customErrorHandler) {
    globalOptions.customErrorHandler(error);
  }

  // Show toast notification if enabled and not suppressed
  if (globalOptions.enableToasts && !globalOptions.suppressDefaultToasts && typeof window !== 'undefined') {
    const errorMessage = getErrorMessage(error, endpoint);
    if (shouldShowToast(errorMessage, endpoint)) {
      toast.error(errorMessage, {
        duration: 5000,
        dismissible: true
      });
    }
  }

  // Re-throw the error so components can still handle it if needed
  throw error;
}

/**
 * Extract a user-friendly error message from various error types
 */
function getErrorMessage(error: unknown, endpoint?: string): string {
  if (error instanceof ApiError) {
    const data = (error as ApiError & { data?: { detail?: unknown; error?: unknown } }).data;
    const detail = data && typeof data === 'object' ? (data as { detail?: unknown }).detail : null;
    const errorCode = data && typeof data === 'object' ? (data as { error?: unknown }).error : null;
    const detailMessage = typeof detail === 'string' ? detail.trim() : null;
    const normalizedErrorCode = typeof errorCode === 'string' ? errorCode : null;

    if (normalizedErrorCode === 'ErrorAccess') {
      return resolveAccessMessage(detailMessage || undefined);
    }

    if (detailMessage && detailMessage.length > 0) {
      return detailMessage;
    }

    // Handle specific HTTP status codes
    switch (error.status) {
      case 0:
        return 'Network error - please check your internet connection';
      case 401:
        return 'Authentication required - please log in';
      case 403:
        return 'Access denied - insufficient permissions';
      case 404:
        return 'Resource not found';
      case 408:
        return 'Request timeout - please try again';
      case 500:
        return 'Server error - please try again later';
      case 502:
        return 'Service temporarily unavailable - please try again';
      case 503:
        return 'Service unavailable - please try again later';
      default:
        return error.message || 'An error occurred';
    }
  }

  if (error instanceof Error) {
    if (error.message === 'Failed to fetch') {
      return 'Network error - please check your internet connection';
    }
    return error.message;
  }

  // Fallback error message
  const endpointInfo = endpoint ? ` (${endpoint})` : '';
  return `An unexpected error occurred${endpointInfo}`;
}

/**
 * Temporarily suppress toast notifications for specific operations
 */
export function withSuppressedToasts<T>(operation: () => Promise<T>): Promise<T> {
  const originalSuppressed = globalOptions.suppressDefaultToasts;
  globalOptions.suppressDefaultToasts = true;

  return operation().finally(() => {
    globalOptions.suppressDefaultToasts = originalSuppressed;
  });
}

/**
 * Enable toast notifications globally (default is enabled)
 */
export function enableGlobalToasts() {
  globalOptions.enableToasts = true;
}

/**
 * Disable toast notifications globally
 */
export function disableGlobalToasts() {
  globalOptions.enableToasts = false;
}
