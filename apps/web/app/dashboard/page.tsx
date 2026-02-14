'use client';

/**
 * Dashboard Page
 *
 * Main home screen after login. Shows:
 *   - Welcome header with user's name
 *   - Due reviews count (fetched from /api/session/active)
 *   - "Start a session" card with topic selector
 *   - Recent sessions list (placeholder while API is wired)
 *   - "Begin Learning" button → /session/new
 *
 * Uses Encounter stage design tokens (warm, inviting).
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  getStoredUser,
  getActiveSession,
  listTopics,
  logout,
  type ActiveSessionInfo,
  type Topic,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DueReviewBadge({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-secondary text-text-secondary text-sm">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: 'var(--accent-secondary, #6B7280)' }}
          aria-hidden="true"
        />
        No reviews due
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold text-neutral-white"
      style={{ backgroundColor: 'var(--accent-primary, #F59E0B)' }}
    >
      <span
        className="inline-block w-2 h-2 rounded-full bg-neutral-white opacity-80"
        aria-hidden="true"
      />
      {count} review{count !== 1 ? 's' : ''} due
    </span>
  );
}

function SessionStartCard({
  topics,
  topicsLoading,
  selectedTopicId,
  onSelectTopic,
  onBegin,
  starting,
}: {
  topics: Topic[];
  topicsLoading: boolean;
  selectedTopicId: string;
  onSelectTopic: (id: string) => void;
  onBegin: () => void;
  starting: boolean;
}) {
  return (
    <Card glow padding="lg">
      <CardHeader>
        <CardTitle as="h2">Start a session</CardTitle>
        <CardDescription>
          Choose a topic and begin a new learning session.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {topicsLoading ? (
          <div className="h-12 rounded-element bg-bg-secondary animate-pulse" aria-label="Loading topics" />
        ) : topics.length === 0 ? (
          <p className="text-text-secondary text-sm">
            No topics available yet. Check back soon.
          </p>
        ) : (
          <div className="space-y-2">
            <label
              htmlFor="topic-select"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              Topic
            </label>
            <select
              id="topic-select"
              value={selectedTopicId}
              onChange={(e) => onSelectTopic(e.target.value)}
              className="w-full bg-bg-secondary text-text-primary border border-transparent rounded-element px-4 py-3 text-base focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-[border-color] duration-short"
              disabled={starting}
            >
              <option value="" disabled>
                Select a topic…
              </option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                  {t.estimatedMinutes ? ` · ~${t.estimatedMinutes}min` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={onBegin}
          loading={starting}
          disabled={starting || !selectedTopicId}
          aria-label="Begin learning session"
        >
          Begin Learning
        </Button>
      </CardFooter>
    </Card>
  );
}

function RecentSessionsCard() {
  // Placeholder — full implementation wires /api/session/list
  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle as="h2">Recent sessions</CardTitle>
        <CardDescription>Your last few learning sessions.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-bg-primary/50 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="h-4 w-32 rounded bg-bg-secondary animate-pulse mb-1" />
                <div className="h-3 w-20 rounded bg-bg-secondary animate-pulse opacity-60" />
              </div>
              <div className="h-4 w-12 rounded bg-bg-secondary animate-pulse ml-4" />
            </div>
          ))}
        </div>
        <p className="text-xs text-text-secondary mt-3 text-center">
          Session history coming soon
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();

  const user = getStoredUser();

  const [activeInfo, setActiveInfo] = useState<ActiveSessionInfo | null>(null);
  const [activeLoading, setActiveLoading] = useState(true);

  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);

  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [starting, setStarting] = useState(false);

  // Fetch active session info (due reviews, etc.)
  useEffect(() => {
    getActiveSession()
      .then(setActiveInfo)
      .catch(() => setActiveInfo({ sessionId: null, dueReviewCount: 0, nextTopicId: null, nextTopicTitle: null }))
      .finally(() => setActiveLoading(false));
  }, []);

  // Fetch topics
  useEffect(() => {
    listTopics()
      .then((ts) => {
        setTopics(ts);
        if (ts.length > 0) setSelectedTopicId(ts[0].id);
      })
      .catch(() => setTopics([]))
      .finally(() => setTopicsLoading(false));
  }, []);

  function handleBegin() {
    if (!selectedTopicId) return;
    setStarting(true);
    // Navigate to /session/new — the session page handles creation
    router.push(`/session/new?topicId=${encodeURIComponent(selectedTopicId)}`);
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const dueCount = activeInfo?.dueReviewCount ?? 0;
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div
      data-stage="encounter"
      className="min-h-screen bg-bg-primary"
    >
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-bg-primary/95 backdrop-blur-sm border-b border-bg-secondary/50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-lg font-display font-bold text-text-primary">
            Hemisphere
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            aria-label="Sign out"
          >
            Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Welcome header */}
        <section aria-labelledby="welcome-heading">
          <h1
            id="welcome-heading"
            className="text-3xl font-display font-bold text-text-primary mb-2"
          >
            Welcome back, {firstName}
          </h1>

          <div className="flex items-center gap-3 mt-3">
            {activeLoading ? (
              <div className="h-7 w-28 rounded-full bg-bg-secondary animate-pulse" />
            ) : (
              <DueReviewBadge count={dueCount} />
            )}
          </div>
        </section>

        {/* Start session card */}
        <section aria-labelledby="start-session-heading">
          <h2 id="start-session-heading" className="sr-only">
            Start a new session
          </h2>
          <SessionStartCard
            topics={topics}
            topicsLoading={topicsLoading}
            selectedTopicId={selectedTopicId}
            onSelectTopic={setSelectedTopicId}
            onBegin={handleBegin}
            starting={starting}
          />
        </section>

        {/* Recent sessions */}
        <section aria-labelledby="recent-sessions-heading">
          <h2 id="recent-sessions-heading" className="sr-only">
            Recent sessions
          </h2>
          <RecentSessionsCard />
        </section>
      </main>
    </div>
  );
}
