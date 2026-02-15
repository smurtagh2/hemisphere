'use client';

/**
 * Analytics Dashboard Page
 *
 * Learner-facing analytics at /dashboard/analytics.
 * Shows:
 *   1. Knowledge Velocity — items learned per day over the last 14 days (SVG sparkline)
 *   2. Hemisphere Balance Score (HBS) — -1 to +1 LH/RH balance indicator
 *   3. Memory Retention Forecast — next 7 days due counts (SVG bar chart)
 *   4. Stage Distribution — Encounter / Analysis / Return breakdown
 *
 * TODO: replace with API call to /api/analytics/learner
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Sparkline } from '@/components/ui/Sparkline';
import { BarChart } from '@/components/ui/BarChart';
import { getStoredUser } from '@/lib/api';

// ---------------------------------------------------------------------------
// Mock data — realistic static data for now
// TODO: replace with API call to /api/analytics/learner
// ---------------------------------------------------------------------------

function getMockAnalyticsData() {
  const velocityData = [2, 5, 3, 7, 4, 6, 8, 5, 9, 6, 7, 10, 8, 11];

  const forecastData = [
    { label: 'Mon', value: 8 },
    { label: 'Tue', value: 5 },
    { label: 'Wed', value: 12 },
    { label: 'Thu', value: 7 },
    { label: 'Fri', value: 4 },
    { label: 'Sat', value: 9 },
    { label: 'Sun', value: 3 },
  ];

  const stageDistribution = {
    encounter: 42,
    analysis: 38,
    return: 20,
  };

  // HBS: positive = more RH (Encounter/Return), negative = more LH (Analysis)
  const hbs = 0.18;

  const totalItems = 247;
  const streakDays = 12;
  const retentionRate = 0.84;

  return {
    velocityData,
    forecastData,
    stageDistribution,
    hbs,
    totalItems,
    streakDays,
    retentionRate,
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: '12px 20px',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        minWidth: 80,
      }}
    >
      <span
        style={{
          fontSize: 'var(--text-xl)',
          fontWeight: 'var(--font-bold)',
          color: 'var(--accent-primary)',
          fontFamily: 'var(--font-display)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--text-secondary)',
          textAlign: 'center',
        }}
      >
        {label}
      </span>
    </div>
  );
}

function HBSIndicator({ score }: { score: number }) {
  // score is -1 (pure LH / Analysis) to +1 (pure RH / Encounter+Return)
  const clampedScore = Math.max(-1, Math.min(1, score));
  // Map -1..+1 to 0..100 for positioning
  const pct = ((clampedScore + 1) / 2) * 100;

  const label =
    clampedScore > 0.2
      ? 'Right-hemisphere dominant'
      : clampedScore < -0.2
      ? 'Left-hemisphere dominant'
      : 'Well balanced';

  const indicatorColor =
    clampedScore > 0.2
      ? 'var(--encounter-accent-primary)'
      : clampedScore < -0.2
      ? 'var(--analysis-accent-primary)'
      : 'var(--semantic-success)';

  return (
    <div style={{ width: '100%' }}>
      {/* Track */}
      <div
        style={{
          position: 'relative',
          height: 12,
          borderRadius: 'var(--radius-full)',
          background: 'var(--bg-primary)',
          overflow: 'visible',
          margin: '8px 0',
        }}
      >
        {/* LH half */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '50%',
            height: '100%',
            background: 'var(--analysis-accent-primary)',
            opacity: 0.25,
            borderRadius: 'var(--radius-full) 0 0 var(--radius-full)',
          }}
        />
        {/* RH half */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '50%',
            height: '100%',
            background: 'var(--encounter-accent-primary)',
            opacity: 0.25,
            borderRadius: '0 var(--radius-full) var(--radius-full) 0',
          }}
        />
        {/* Thumb */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${pct}%`,
            transform: 'translate(-50%, -50%)',
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: indicatorColor,
            border: '2px solid var(--bg-secondary)',
            boxShadow: '0 0 8px rgba(0,0,0,0.4)',
            zIndex: 1,
          }}
        />
      </div>

      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          LH-dominant
        </span>
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: indicatorColor,
            fontWeight: 'var(--font-semibold)',
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          RH-dominant
        </span>
      </div>
    </div>
  );
}

function StageDistributionChart({
  encounter,
  analysis,
  returnStage,
}: {
  encounter: number;
  analysis: number;
  returnStage: number;
}) {
  const total = encounter + analysis + returnStage;
  const encounterPct = total > 0 ? (encounter / total) * 100 : 33;
  const analysisPct = total > 0 ? (analysis / total) * 100 : 33;
  const returnPct = total > 0 ? (returnStage / total) * 100 : 34;

  const segments = [
    { pct: encounterPct, color: 'var(--encounter-accent-primary)', label: 'Encounter', count: encounter },
    { pct: analysisPct, color: 'var(--analysis-accent-primary)', label: 'Analysis', count: analysis },
    { pct: returnPct, color: 'var(--return-accent-primary)', label: 'Return', count: returnStage },
  ];

  return (
    <div style={{ width: '100%' }}>
      {/* Bar */}
      <div
        style={{
          display: 'flex',
          height: 16,
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          gap: 2,
        }}
      >
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{
              width: `${seg.pct}%`,
              background: seg.color,
              opacity: 0.85,
              transition: 'width 0.4s ease',
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginTop: 12,
          flexWrap: 'wrap',
        }}
      >
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: seg.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              {seg.label}
            </span>
            <span
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-primary)',
                fontWeight: 'var(--font-semibold)',
              }}
            >
              {seg.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VelocityChart({ data }: { data: number[] }) {
  const today = new Date();
  const labels = data.map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (data.length - 1 - i));
    return d.getDate().toString();
  });

  return (
    <div style={{ width: '100%' }}>
      <div style={{ width: '100%', overflow: 'hidden' }}>
        <Sparkline
          data={data}
          width={560}
          height={64}
          color="var(--accent-primary)"
          label="Items learned per day over the past 14 days"
        />
      </div>
      {/* Date axis (show first, middle, last) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
        }}
      >
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          {labels[0]}
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          {labels[Math.floor(labels.length / 2)]}
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          Today
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsDashboardPage() {
  const router = useRouter();
  const user = getStoredUser();
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  // TODO: replace with API call to /api/analytics/learner
  const [analytics] = useState(() => getMockAnalyticsData());

  const { velocityData, forecastData, stageDistribution, hbs, totalItems, streakDays, retentionRate } = analytics;

  return (
    <div
      data-stage="encounter"
      className="min-h-screen bg-bg-primary"
    >
      {/* Top bar */}
      <header
        className="sticky top-0 z-10 bg-bg-primary/95 backdrop-blur-sm border-b border-bg-secondary/50"
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            aria-label="Back to dashboard"
          >
            Back
          </Button>
          <span className="text-lg font-display font-bold text-text-primary">
            Your Progress
          </span>
          <div style={{ width: 64 }} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Page heading */}
        <section>
          <h1 className="text-3xl font-display font-bold text-text-primary mb-1">
            Analytics
          </h1>
          <p className="text-text-secondary text-sm">
            A snapshot of your learning journey, {firstName}.
          </p>
        </section>

        {/* Summary stats row */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatPill label="Total items" value={totalItems} />
          <StatPill label="Day streak" value={`${streakDays}d`} />
          <StatPill label="Retention" value={`${Math.round(retentionRate * 100)}%`} />
        </div>

        {/* Knowledge Velocity */}
        <section aria-labelledby="velocity-heading">
          <Card padding="lg">
            <CardHeader>
              <CardTitle as="h2" id="velocity-heading">
                Knowledge Velocity
              </CardTitle>
              <CardDescription>
                Items learned per day over the last 14 days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VelocityChart data={velocityData} />
            </CardContent>
          </Card>
        </section>

        {/* Hemisphere Balance Score */}
        <section aria-labelledby="hbs-heading">
          <Card padding="lg">
            <CardHeader>
              <CardTitle as="h2" id="hbs-heading">
                Hemisphere Balance Score
              </CardTitle>
              <CardDescription>
                How evenly your sessions balance left-hemisphere (analytical) and
                right-hemisphere (creative/reflective) learning modes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HBSIndicator score={hbs} />
              <p
                style={{
                  marginTop: 12,
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-secondary)',
                }}
              >
                Score: <strong style={{ color: 'var(--text-primary)' }}>{hbs.toFixed(2)}</strong>
                {' '}(−1 = pure Analysis, +1 = pure Encounter/Return)
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Memory Retention Forecast */}
        <section aria-labelledby="forecast-heading">
          <Card padding="lg">
            <CardHeader>
              <CardTitle as="h2" id="forecast-heading">
                Memory Retention Forecast
              </CardTitle>
              <CardDescription>
                Estimated reviews due each day over the next 7 days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart
                data={forecastData}
                color="var(--accent-primary)"
                height={90}
              />
            </CardContent>
          </Card>
        </section>

        {/* Stage Distribution */}
        <section aria-labelledby="distribution-heading">
          <Card padding="lg">
            <CardHeader>
              <CardTitle as="h2" id="distribution-heading">
                Stage Distribution
              </CardTitle>
              <CardDescription>
                Breakdown of items seen across Encounter, Analysis, and Return stages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StageDistributionChart
                encounter={stageDistribution.encounter}
                analysis={stageDistribution.analysis}
                returnStage={stageDistribution.return}
              />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
