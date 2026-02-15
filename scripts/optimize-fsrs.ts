#!/usr/bin/env tsx
import { db, schema } from '../packages/db/src/index.js';
import {
  DEFAULT_FSRS_WEIGHTS,
  optimizeLearnerFsrsParameters,
  type FsrsWeights,
} from '../packages/shared/src/index.js';

interface CliOptions {
  dryRun: boolean;
  minReviews: number;
  limit: number | null;
}

interface LearnerAggregate {
  userId: string;
  totalReviews: number;
  totalLapses: number;
  retrievabilitySum: number;
  stabilitySum: number;
  difficultySum: number;
  cardCount: number;
}

function parseArgs(argv: string[]): CliOptions {
  let dryRun = false;
  let minReviews = 50;
  let limit: number | null = null;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg.startsWith('--min-reviews=')) {
      const parsed = Number(arg.slice('--min-reviews='.length));
      if (Number.isFinite(parsed) && parsed >= 1) {
        minReviews = Math.floor(parsed);
      }
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number(arg.slice('--limit='.length));
      if (Number.isFinite(parsed) && parsed >= 1) {
        limit = Math.floor(parsed);
      }
    }
  }

  return { dryRun, minReviews, limit };
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const now = new Date();

  const memoryRows = await db
    .select({
      userId: schema.fsrsMemoryState.userId,
      reviewCount: schema.fsrsMemoryState.reviewCount,
      lapseCount: schema.fsrsMemoryState.lapseCount,
      retrievability: schema.fsrsMemoryState.retrievability,
      stability: schema.fsrsMemoryState.stability,
      difficulty: schema.fsrsMemoryState.difficulty,
    })
    .from(schema.fsrsMemoryState);

  const aggregateByUser = new Map<string, LearnerAggregate>();

  for (const row of memoryRows) {
    if (row.reviewCount <= 0) continue;

    const current = aggregateByUser.get(row.userId) ?? {
      userId: row.userId,
      totalReviews: 0,
      totalLapses: 0,
      retrievabilitySum: 0,
      stabilitySum: 0,
      difficultySum: 0,
      cardCount: 0,
    };

    current.totalReviews += row.reviewCount;
    current.totalLapses += row.lapseCount;
    current.retrievabilitySum += row.retrievability;
    current.stabilitySum += row.stability;
    current.difficultySum += row.difficulty;
    current.cardCount += 1;

    aggregateByUser.set(row.userId, current);
  }

  const aggregates = [...aggregateByUser.values()]
    .filter((agg) => agg.totalReviews >= options.minReviews)
    .sort((a, b) => b.totalReviews - a.totalReviews);

  const selected = options.limit !== null ? aggregates.slice(0, options.limit) : aggregates;

  if (selected.length === 0) {
    console.log(
      `[optimize-fsrs] No learners met threshold (minReviews=${options.minReviews}).`
    );
    return;
  }

  const existingParamsRows = await db
    .select({
      userId: schema.fsrsParameters.userId,
      weights: schema.fsrsParameters.weights,
      targetRetention: schema.fsrsParameters.targetRetention,
    })
    .from(schema.fsrsParameters);
  const existingParamsByUser = new Map(existingParamsRows.map((row) => [row.userId, row]));

  let optimizedCount = 0;

  for (const agg of selected) {
    const averages = {
      averageRetrievability: agg.cardCount > 0 ? agg.retrievabilitySum / agg.cardCount : 1,
      averageStability: agg.cardCount > 0 ? agg.stabilitySum / agg.cardCount : 1,
      averageDifficulty: agg.cardCount > 0 ? agg.difficultySum / agg.cardCount : 5,
    };

    const existing = existingParamsByUser.get(agg.userId);
    const baseWeights: FsrsWeights = existing?.weights
      ? { w: existing.weights }
      : DEFAULT_FSRS_WEIGHTS;

    const optimized = optimizeLearnerFsrsParameters({
      totalReviews: agg.totalReviews,
      totalLapses: agg.totalLapses,
      averageRetrievability: averages.averageRetrievability,
      averageStability: averages.averageStability,
      averageDifficulty: averages.averageDifficulty,
      baseWeights,
    });

    if (options.dryRun) {
      console.log(
        [
          `[dry-run] user=${agg.userId}`,
          `reviews=${agg.totalReviews}`,
          `lapses=${agg.totalLapses}`,
          `targetRetention=${optimized.targetRetention.toFixed(3)}`,
          `adjustmentScore=${optimized.adjustmentScore.toFixed(3)}`,
        ].join(' ')
      );
      optimizedCount += 1;
      continue;
    }

    await db
      .insert(schema.fsrsParameters)
      .values({
        userId: agg.userId,
        weights: optimized.optimizedWeights,
        targetRetention: optimized.targetRetention,
        optimizedAt: now,
        reviewCount: agg.totalReviews,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [schema.fsrsParameters.userId],
        set: {
          weights: optimized.optimizedWeights,
          targetRetention: optimized.targetRetention,
          optimizedAt: now,
          reviewCount: agg.totalReviews,
          updatedAt: now,
        },
      });

    optimizedCount += 1;
  }

  console.log(
    `[optimize-fsrs] Processed ${optimizedCount} learner(s)` +
      ` (eligible=${aggregates.length}, minReviews=${options.minReviews}, dryRun=${options.dryRun})`
  );
}

run().catch((err) => {
  console.error('[optimize-fsrs] Failed:', err);
  process.exitCode = 1;
});
