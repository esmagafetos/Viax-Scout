import * as Sentry from '@sentry/react-native';

declare const process: { env: Record<string, string | undefined> };

/**
 * Sentry is wired conditionally: it only initializes when
 * `EXPO_PUBLIC_SENTRY_DSN` is set at build time. Without it, every helper
 * here is a no-op so the app keeps working without a Sentry account.
 *
 * To enable in production:
 *   1. Set `EXPO_PUBLIC_SENTRY_DSN` as an EAS secret (or env var locally).
 *   2. (Optional) Set `SENTRY_AUTH_TOKEN` so EAS uploads source maps
 *      automatically via the metro-plugin bundled with the SDK.
 */
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
let initialized = false;

export function initSentry(): void {
  if (initialized || !DSN) return;
  try {
    Sentry.init({
      dsn: DSN,
      // Sample 100% of errors (free tier handles low volume well);
      // performance traces sampled lower to keep quota.
      tracesSampleRate: 0.1,
      // Defer session-replay-style breadcrumbs to reduce PII risk.
      sendDefaultPii: false,
      // Do not block app startup if Sentry's transport is slow.
      enableAutoSessionTracking: true,
      // Strip release info from EAS Update (filled in by SDK).
    });
    initialized = true;
  } catch {
    // Never let observability break the app.
    initialized = false;
  }
}

export function isSentryEnabled(): boolean {
  return initialized;
}

/**
 * Report an exception. Always safe to call: no-op if Sentry isn't enabled.
 */
export function reportError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  // Always log to console so you can see errors during development even
  // without a DSN configured.
  // eslint-disable-next-line no-console
  console.error('[error]', error, context ?? '');
  if (!initialized) return;
  try {
    if (context && Object.keys(context).length > 0) {
      Sentry.withScope((scope) => {
        for (const [k, v] of Object.entries(context)) scope.setExtra(k, v);
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  } catch {
    // ignore
  }
}

/** Tag the current Sentry scope with a logged-in user id. No-op when off. */
export function identifyUser(user: { id: number | string; email?: string } | null): void {
  if (!initialized) return;
  try {
    if (!user) {
      Sentry.setUser(null);
      return;
    }
    Sentry.setUser({ id: String(user.id), email: user.email });
  } catch {
    // ignore
  }
}
