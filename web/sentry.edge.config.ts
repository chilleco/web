import * as Sentry from "@sentry/nextjs";
import { isNonProdAppEnv, resolveAppEnv } from "./src/shared/lib/env";

const environment = resolveAppEnv(process.env.NEXT_PUBLIC_ENV);
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";
const defaultSampleRate = isNonProdAppEnv(environment) ? 1.0 : 0.2;

const asFloat = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
};

const tracesSampleRate = asFloat(
  process.env.SENTRY_TRACES_SAMPLE_RATE ?? process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  defaultSampleRate
);
const profilesSampleRate =
  tracesSampleRate > 0
    ? asFloat(
        process.env.SENTRY_PROFILES_SAMPLE_RATE ??
          process.env.NEXT_PUBLIC_SENTRY_PROFILES_SAMPLE_RATE,
        tracesSampleRate
      )
    : 0.0;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment,
  release:
    process.env.SENTRY_RELEASE ?? process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? process.env.RELEASE,
  tracesSampleRate,
  profilesSampleRate,
  attachStacktrace: true,
  maxValueLength: 4096,
  normalizeDepth: 5,
  initialScope: {
    tags: {
      service: "web",
    },
  },
});
