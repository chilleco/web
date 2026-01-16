import * as Sentry from "@sentry/nextjs";

const environment = process.env.NEXT_PUBLIC_ENV ?? process.env.NODE_ENV ?? "local";
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";
const defaultSampleRate = ["local", "test", "dev"].includes(environment) ? 1.0 : 0.2;

const asFloat = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
};

const tracesSampleRate = asFloat(
  process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  defaultSampleRate
);
const profilesSampleRate =
  tracesSampleRate > 0
    ? asFloat(process.env.NEXT_PUBLIC_SENTRY_PROFILES_SAMPLE_RATE, tracesSampleRate)
    : 0.0;
const replaysSessionSampleRate = asFloat(
  process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
  0.0
);
const replaysOnErrorSampleRate = asFloat(
  process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
  1.0
);

const traceTargets = [
  process.env.NEXT_PUBLIC_API ?? "",
  process.env.NEXT_PUBLIC_WEB ?? "",
  /^\//,
].filter(Boolean);

const replayIntegration =
  "replayIntegration" in Sentry ? (Sentry as typeof Sentry).replayIntegration() : null;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? process.env.NEXT_PUBLIC_RELEASE,
  tracesSampleRate,
  profilesSampleRate,
  replaysSessionSampleRate,
  replaysOnErrorSampleRate,
  tracePropagationTargets: traceTargets,
  attachStacktrace: true,
  maxValueLength: 4096,
  normalizeDepth: 5,
  initialScope: {
    tags: {
      service: "web",
    },
  },
  integrations: replayIntegration ? [replayIntegration] : [],
});
