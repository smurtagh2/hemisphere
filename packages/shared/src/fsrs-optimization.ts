import { DEFAULT_FSRS_WEIGHTS, type FsrsWeights } from './fsrs';

export interface LearnerFsrsOptimizationInput {
  totalReviews: number;
  totalLapses: number;
  averageRetrievability: number;
  averageStability: number;
  averageDifficulty: number;
  baseWeights?: FsrsWeights;
}

export interface LearnerFsrsOptimizationResult {
  optimizedWeights: number[];
  targetRetention: number;
  lapseRate: number;
  adjustmentScore: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Lightweight per-learner FSRS tuning heuristic for weekly batch optimization.
 *
 * The optimizer intentionally applies small bounded adjustments to key FSRS
 * weights based on learner-level retention signals (lapse rate +
 * retrievability). This keeps behavior stable while still personalizing.
 */
export function optimizeLearnerFsrsParameters(
  input: LearnerFsrsOptimizationInput
): LearnerFsrsOptimizationResult {
  const baseWeights = input.baseWeights?.w ?? DEFAULT_FSRS_WEIGHTS.w;
  const optimizedWeights = [...baseWeights];

  const totalReviews = Math.max(0, input.totalReviews);
  const totalLapses = Math.max(0, input.totalLapses);
  const lapseRate = totalReviews > 0 ? totalLapses / totalReviews : 0;
  const averageRetrievability = clamp(input.averageRetrievability, 0, 1);
  const averageDifficulty = clamp(input.averageDifficulty, 1, 10);

  // Positive score => tighten scheduling; negative score => relax scheduling.
  const lapsePressure = clamp((lapseRate - 0.15) / 0.2, -1, 1);
  const retrievabilityPressure = clamp((averageRetrievability - 0.82) / 0.25, -1, 1);
  const difficultyPressure = clamp((averageDifficulty - 5.5) / 3, -1, 1);
  const adjustmentScore = clamp(
    lapsePressure - retrievabilityPressure * 0.5 + difficultyPressure * 0.15,
    -1,
    1
  );

  const growthScale = clamp(1 - adjustmentScore * 0.12, 0.85, 1.15);
  const lapseScale = clamp(1 + adjustmentScore * 0.15, 0.85, 1.2);
  const easyScale = clamp(1 - adjustmentScore * 0.1, 0.85, 1.15);
  const hardScale = clamp(1 - adjustmentScore * 0.1, 0.8, 1.2);

  // Recall-growth controls
  optimizedWeights[8] = clamp(baseWeights[8] * growthScale, 0.8, 3.5);
  optimizedWeights[10] = clamp(baseWeights[10] * growthScale, 0.5, 2.5);

  // Lapse penalty controls
  optimizedWeights[11] = clamp(baseWeights[11] * lapseScale, 0.8, 3.5);
  optimizedWeights[14] = clamp(baseWeights[14] * lapseScale, 1.0, 3.5);

  // Hard/Easy scaling controls
  optimizedWeights[15] = clamp(baseWeights[15] * hardScale, 0.08, 0.9);
  optimizedWeights[16] = clamp(baseWeights[16] * easyScale, 1.5, 4.5);

  // Heuristic target retention tuning: tighter for high lapse rate.
  const targetRetention = clamp(0.9 + adjustmentScore * 0.05, 0.82, 0.95);

  return {
    optimizedWeights,
    targetRetention,
    lapseRate,
    adjustmentScore,
  };
}
