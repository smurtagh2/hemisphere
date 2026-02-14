'use client';

/**
 * Session Complete Page  —  /session/[id]/complete
 *
 * Shown after a full learning loop finishes. Displays session summary stats,
 * congratulations message, and navigation back to the dashboard.
 *
 * Stats are fetched from /api/session/:id. If the fetch fails (e.g. API not
 * fully wired) the page still renders a graceful success state.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getSession, getToken, type SessionRecord } from '@/lib/api';

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------

function StatTile({
  label,
  value,
  suffix = '',
}: {
  label: string;
  value: string | number | null;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 p-4 rounded-card bg-bg-secondary">
      <span className="text-3xl font-display font-bold text-text-primary">
        {value !== null ? `${value}${suffix}` : '—'}
      </span>
      <span className="text-xs text-text-secondary font-body uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SessionCompletePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;

  const [session, setSession] = useState<SessionRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }

    getSession(sessionId)
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, [sessionId, router]);

  const accuracy =
    session?.accuracy !== null && session?.accuracy !== undefined
      ? Math.round(session.accuracy * 100)
      : null;

  const durationMs =
    session?.startedAt && session?.completedAt
      ? new Date(session.completedAt).getTime() -
        new Date(session.startedAt).getTime()
      : null;

  const durationMin =
    durationMs !== null ? Math.round(durationMs / 60000) : null;

  return (
    <div
      data-stage="return"
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--return-bg-primary, #1a0f1e)' }}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Celebration mark */}
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
            style={{
              backgroundColor: 'rgba(168, 92, 138, 0.15)',
              border: '2px solid var(--return-accent-primary, #A85C8A)',
            }}
            aria-hidden="true"
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M8 20L16.5 28.5L32 12"
                stroke="var(--return-accent-primary, #A85C8A)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1
            className="text-3xl font-display font-bold mb-2"
            style={{ color: 'var(--return-text-primary, #F3E8FF)' }}
          >
            Session complete
          </h1>
          <p
            className="font-body"
            style={{ color: 'var(--return-text-secondary, #C4A8D4)' }}
          >
            {session?.topicTitle
              ? `Great work on "${session.topicTitle}".`
              : 'Great work today.'}
          </p>
        </div>

        {/* Stats */}
        <Card padding="md" background="secondary">
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-card bg-bg-primary animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  label="Accuracy"
                  value={accuracy}
                  suffix="%"
                />
                <StatTile
                  label="Duration"
                  value={durationMin}
                  suffix=" min"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* What's next */}
        <Card padding="lg" glow>
          <CardHeader>
            <CardTitle as="h2">What's next?</CardTitle>
            <CardDescription>
              Your reviews have been scheduled. Come back tomorrow to keep the
              material fresh with spaced repetition.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => router.push('/dashboard')}
            >
              Back to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
