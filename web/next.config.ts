import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Image configuration for external domains - allow all HTTPS domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  // Ensure proper bundle handling
  webpack: (config, { isServer, dev }) => {
    // Enable polling for file watching in Docker environments
    if (dev && process.env.NODE_ENV === 'development') {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    
    // Ensure proper client/server split
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  // Basic optimizations
  trailingSlash: false,
  poweredByHeader: false,
};

const configWithIntl = withNextIntl(nextConfig);

const release =
  process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? process.env.SENTRY_RELEASE ?? process.env.RELEASE;
const hasSentryAuth = Boolean(process.env.SENTRY_AUTH_TOKEN);

const sentryBuildOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  release: release ? { name: release } : undefined,
  silent: true,
  widenClientFileUpload: true,
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
  sourcemaps: {
    disable: !hasSentryAuth,
    deleteSourcemapsAfterUpload: true,
  },
  errorHandler: (err: Error) => {
    console.warn(err);
  },
};

export default withSentryConfig(configWithIntl, sentryBuildOptions);
