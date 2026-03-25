import { getPublicAppEnv, isProdLikeAppEnv } from '@/shared/lib/env';

const appEnv = getPublicAppEnv();
const isProdLikeEnv = isProdLikeAppEnv(appEnv);

// Application configuration
export const APP_CONFIG = {
  name: 'Launchpad',
  version: '1.0.0',
  description: 'Reusable full-stack launch template',
  author: 'Alex Poloz',

  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API || 'http://api:5000/',
    timeout: 10000,
    retries: 3,
  },

  // Feature flags
  features: {
    analytics: isProdLikeEnv,
    darkMode: true,
    i18n: true,
    telemetry: isProdLikeEnv,
  },

  // UI Configuration
  ui: {
    defaultTheme: 'system' as const,
    toastPosition: 'bottom-right' as const,
    maxToasts: 5,
    defaultToastDuration: 4000,
  },

  // Pagination
  pagination: {
    defaultLimit: 12,
    maxLimit: 100,
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
