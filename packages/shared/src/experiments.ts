export interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: ExperimentVariant[];
  /** 0..1, fraction of users exposed */
  trafficFraction: number;
  status: 'active' | 'paused' | 'concluded';
}

export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number; // relative weight, variants normalised to sum to 1
}

export interface ExperimentAssignment {
  experimentId: string;
  variantId: string;
  assignedAt: Date;
}

/**
 * Simple djb2 hash mapped to a 0..1 float.
 */
export function hashToFloat(input: string): number {
  let h = 5381;
  for (const c of input) h = ((h << 5) + h) ^ c.charCodeAt(0);
  return (h >>> 0) / 0xffffffff;
}

/**
 * Deterministically assign a user to a variant using a hash of userId + experimentId.
 * Returns null if the user falls outside the trafficFraction.
 */
export function assignVariant(
  userId: string,
  experiment: Experiment
): ExperimentVariant | null {
  // Step 1: traffic gate — exclude users outside the exposure fraction
  if (hashToFloat(userId + experiment.id) > experiment.trafficFraction) {
    return null;
  }

  // Step 2: pick variant by walking cumulative weight distribution
  const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
  const roll = hashToFloat(userId + experiment.id + 'variant') * totalWeight;

  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (roll < cumulative) {
      return variant;
    }
  }

  // Fallback to last variant (handles floating-point edge cases)
  return experiment.variants[experiment.variants.length - 1] ?? null;
}
