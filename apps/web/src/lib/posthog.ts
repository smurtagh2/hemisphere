/**
 * PostHog Analytics Integration
 *
 * Initializes PostHog and exports typed event-tracking functions and a
 * feature-flag React hook. When NEXT_PUBLIC_POSTHOG_KEY is not set the
 * entire integration gracefully no-ops so development environments run
 * without any analytics calls.
 */

import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// PostHog types (subset)
// ---------------------------------------------------------------------------

interface PostHogInstance {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  isFeatureEnabled: (key: string) => boolean | undefined;
  getFeatureFlag: (key: string) => boolean | string | undefined;
  onFeatureFlags: (callback: () => void) => void;
}

// ---------------------------------------------------------------------------
// Singleton initialisation
// ---------------------------------------------------------------------------

let _posthog: PostHogInstance | null = null;

function getPostHog(): PostHogInstance | null {
  if (typeof window === 'undefined') return null;
  if (_posthog) return _posthog;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const posthog = require('posthog-js').default as PostHogInstance & {
    init: (key: string, options: Record<string, unknown>) => void;
    __loaded?: boolean;
  };

  if (!posthog.__loaded) {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      capture_pageview: false,
      loaded: (ph: { opt_out_capturing: () => void }) => {
        if (process.env.NODE_ENV === 'development') {
          ph.opt_out_capturing();
        }
      },
    });
    posthog.__loaded = true;
  }

  _posthog = posthog;
  return _posthog;
}

// ---------------------------------------------------------------------------
// Typed event-tracking functions
// ---------------------------------------------------------------------------

export function trackSessionStarted(
  sessionId: string,
  sessionType: string,
  topicId: string,
): void {
  getPostHog()?.capture('session_started', {
    session_id: sessionId,
    session_type: sessionType,
    topic_id: topicId,
  });
}

export function trackSessionCompleted(
  sessionId: string,
  sessionType: string,
  durationMs: number,
): void {
  getPostHog()?.capture('session_completed', {
    session_id: sessionId,
    session_type: sessionType,
    duration_ms: durationMs,
  });
}

export function trackEncounterViewed(encounterId: string, screenType: string): void {
  getPostHog()?.capture('encounter_viewed', {
    encounter_id: encounterId,
    screen_type: screenType,
  });
}

export function trackReviewRated(
  itemId: string,
  rating: number | string,
  retrievability: number,
): void {
  getPostHog()?.capture('review_rated', {
    item_id: itemId,
    rating,
    retrievability,
  });
}

export function trackFeatureFlag(flagKey: string, value: boolean | string | undefined): void {
  getPostHog()?.capture('$feature_flag_called', {
    $feature_flag: flagKey,
    $feature_flag_response: value,
  });
}

// ---------------------------------------------------------------------------
// Feature flag hook
// ---------------------------------------------------------------------------

export function useFeatureFlag(flagKey: string): boolean | string | undefined {
  const [value, setValue] = useState<boolean | string | undefined>(() => {
    const ph = getPostHog();
    return ph ? ph.getFeatureFlag(flagKey) : false;
  });

  useEffect(() => {
    const ph = getPostHog();
    if (!ph) return;

    const current = ph.getFeatureFlag(flagKey);
    setValue(current);

    ph.onFeatureFlags(() => {
      const updated = ph.getFeatureFlag(flagKey);
      setValue(updated);
      trackFeatureFlag(flagKey, updated);
    });
  }, [flagKey]);

  return value;
}
