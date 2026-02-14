#!/usr/bin/env tsx
/**
 * Hemisphere Content Seed Importer
 *
 * Reads validated YAML content files and upserts them into the database.
 * Maps YAML fields to Drizzle schema: topics, knowledge_components,
 * content_items, and content_item_kcs.
 *
 * Usage:
 *   pnpm db:seed                                    # seed all files in content/
 *   pnpm db:seed --dir content/examples             # seed specific directory
 *   pnpm db:seed --file content/examples/foo.yaml   # seed single file
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { glob } from 'glob';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import {
  topics,
  knowledgeComponents,
  contentItems,
  contentItemKcs,
} from '../packages/db/src/schema/index.js';

// ---------------------------------------------------------------------------
// Types mirroring the YAML content schema
// ---------------------------------------------------------------------------

interface MediaReference {
  type: string;
  url: string;
  alt?: string;
  caption?: string;
  duration?: number;
  attribution?: string;
  artistNotes?: string;
}

interface InteractionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
  feedback?: string;
}

interface Interaction {
  id: string;
  type: string;
  prompt: string;
  options?: InteractionOption[];
  correctAnswer?: string | string[];
  feedback?: Record<string, string>;
  modelAnswer?: string;
  allowSkip?: boolean;
  timeLimit?: number;
  media?: MediaReference;
  tags?: string[];
}

interface ContentItemMetadata {
  hemisphere?: 'RH' | 'LH' | 'balanced';
  difficulty?: 'novice' | 'intermediate' | 'advanced';
  adaptiveVariants?: Record<string, unknown>;
}

interface ContentItemYaml {
  id: string;
  type: string;
  title?: string;
  content: string;
  duration?: number;
  media?: MediaReference[];
  interactions?: Interaction[];
  layout?: string;
  emotionalTone?: string;
  metadata?: ContentItemMetadata;
}

interface LearningStage {
  stage: 'encounter' | 'analysis' | 'return';
  name?: string;
  description?: string;
  estimatedDuration?: number;
  uiTheme?: Record<string, string>;
  transition?: Record<string, unknown>;
  contentItems: ContentItemYaml[];
}

interface LearningObjective {
  id: string;
  objective: string;
  bloom: string;
}

interface KnowledgeGraphNode {
  id: string;
  label: string;
  type?: string;
}

interface KnowledgeGraphEdge {
  from: string;
  to: string;
  relationship: string;
}

interface TopicMetadata {
  title: string;
  subtitle?: string;
  summary: string;
  subject: string;
  template: string;
  targetAudience?: string;
  estimatedDuration?: number;
  prerequisites?: string[];
  tags?: string[];
  authors?: Array<{ name: string; role?: string }>;
  createdAt?: string;
  updatedAt?: string;
}

interface TopicYaml {
  id: string;
  version: string;
  metadata: TopicMetadata;
  learningObjectives: LearningObjective[];
  stages: {
    encounter: LearningStage;
    analysis: LearningStage;
    return: LearningStage;
  };
  assessments?: Array<{
    id: string;
    type: string;
    timing: string;
    interactions: Interaction[];
  }>;
  knowledgeGraph?: {
    nodes: KnowledgeGraphNode[];
    edges: KnowledgeGraphEdge[];
  };
}

interface ContentFile {
  schemaVersion: string;
  topics: TopicYaml[];
}

// ---------------------------------------------------------------------------
// Import counters
// ---------------------------------------------------------------------------

interface TableCounts {
  inserted: number;
  updated: number;
  skipped: number;
}

type SeedCounts = Record<
  'topics' | 'knowledge_components' | 'content_items' | 'content_item_kcs',
  TableCounts
>;

function zeroCounts(): TableCounts {
  return { inserted: 0, updated: 0, skipped: 0 };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DIFFICULTY_MAP: Record<string, number> = {
  novice: 1,
  intermediate: 2,
  advanced: 3,
};

const HEMISPHERE_MAP: Record<string, string> = {
  RH: 'RH',
  LH: 'LH',
  balanced: 'balanced',
};

function difficultyLevel(difficulty?: string): number {
  return DIFFICULTY_MAP[difficulty ?? 'novice'] ?? 1;
}

function hemisphereMode(hemisphere?: string): string {
  return HEMISPHERE_MAP[hemisphere ?? 'balanced'] ?? 'balanced';
}

/**
 * Collect all unique media types from a content item's media array
 * and from interactions that have embedded media.
 */
function collectMediaTypes(item: ContentItemYaml): string[] {
  const types = new Set<string>();
  for (const m of item.media ?? []) {
    types.add(m.type);
  }
  for (const ix of item.interactions ?? []) {
    if (ix.media?.type) types.add(ix.media.type);
  }
  return Array.from(types);
}

/**
 * Collect all interaction tags from a content item — these are used to
 * link the item to knowledge components.
 */
function collectInteractionTags(item: ContentItemYaml): string[] {
  const tags = new Set<string>();
  for (const ix of item.interactions ?? []) {
    for (const tag of ix.tags ?? []) {
      tags.add(tag);
    }
  }
  return Array.from(tags);
}

/**
 * Determine if a content item is reviewable (has at least one scorable interaction).
 */
function isReviewable(item: ContentItemYaml): boolean {
  const scorableTypes = new Set([
    'free_recall',
    'cued_recall',
    'multiple_choice',
    'audio_recognition',
    'categorization',
    'drag_drop',
    'sequencing',
    'fill_blank',
  ]);
  return (item.interactions ?? []).some((ix) => scorableTypes.has(ix.type));
}

/**
 * Determine if the item is auto-scorable (no open-ended interactions).
 */
function isAutoScorable(item: ContentItemYaml): boolean {
  const openEndedTypes = new Set(['free_text', 'creative_synthesis', 'transfer_challenge']);
  return !(item.interactions ?? []).some((ix) => openEndedTypes.has(ix.type));
}

/**
 * Get the review format from the first scorable interaction type.
 */
function reviewFormat(item: ContentItemYaml): string | null {
  for (const ix of item.interactions ?? []) {
    if (ix.type) return ix.type;
  }
  return null;
}

/**
 * Derive a bloom level for this content item. Use the topic learning
 * objectives as a reference; default to 'understand'.
 */
function deriveBloomLevel(
  item: ContentItemYaml,
  objectives: LearningObjective[],
  stage: string
): string {
  // Map stage to likely bloom level if no objectives match
  const stageBloom: Record<string, string> = {
    encounter: 'understand',
    analysis: 'analyze',
    return: 'apply',
  };

  if (objectives.length === 0) return stageBloom[stage] ?? 'understand';

  // For practice/activity items, prefer higher bloom levels
  if (item.type === 'activity' || item.type === 'practice') {
    const higher = objectives.find((o) =>
      ['apply', 'analyze', 'evaluate', 'create'].includes(o.bloom)
    );
    if (higher) return higher.bloom;
  }

  return objectives[0]?.bloom ?? stageBloom[stage] ?? 'understand';
}

// ---------------------------------------------------------------------------
// YAML loading
// ---------------------------------------------------------------------------

function loadYaml(filePath: string): ContentFile {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return yaml.load(raw) as ContentFile;
  } catch (err) {
    throw new Error(
      `Failed to parse YAML at ${filePath}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// ---------------------------------------------------------------------------
// Core seed logic
// ---------------------------------------------------------------------------

async function seedTopic(
  db: ReturnType<typeof drizzle>,
  topicYaml: TopicYaml,
  counts: SeedCounts
): Promise<void> {
  const now = new Date();

  // -------------------------------------------------------------------------
  // 1. Upsert topic
  // -------------------------------------------------------------------------
  const topicSlug = topicYaml.id;
  const topicPath = [topicYaml.metadata.subject, topicSlug];

  const existing = await db
    .select({ id: topics.id, updatedAt: topics.updatedAt })
    .from(topics)
    .where(eq(topics.slug, topicSlug));

  let topicId: string;

  if (existing.length > 0) {
    // Update
    await db
      .update(topics)
      .set({
        name: topicYaml.metadata.title,
        description: topicYaml.metadata.summary,
        topicPath,
        updatedAt: now,
      })
      .where(eq(topics.slug, topicSlug));
    topicId = existing[0]!.id;
    counts.topics.updated++;
  } else {
    // Insert
    const inserted = await db
      .insert(topics)
      .values({
        slug: topicSlug,
        name: topicYaml.metadata.title,
        description: topicYaml.metadata.summary,
        topicPath,
        isPublished: false,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: topics.id });
    topicId = inserted[0]!.id;
    counts.topics.inserted++;
  }

  // -------------------------------------------------------------------------
  // 2. Upsert knowledge components from knowledgeGraph nodes
  // -------------------------------------------------------------------------
  const kcSlugToId = new Map<string, string>();

  if (topicYaml.knowledgeGraph?.nodes) {
    for (const node of topicYaml.knowledgeGraph.nodes) {
      const existingKc = await db
        .select({ id: knowledgeComponents.id })
        .from(knowledgeComponents)
        .where(
          and(
            eq(knowledgeComponents.topicId, topicId),
            eq(knowledgeComponents.slug, node.id)
          )
        );

      let kcId: string;

      if (existingKc.length > 0) {
        await db
          .update(knowledgeComponents)
          .set({ name: node.label, description: node.type ?? null })
          .where(eq(knowledgeComponents.id, existingKc[0]!.id));
        kcId = existingKc[0]!.id;
        counts.knowledge_components.updated++;
      } else {
        const inserted = await db
          .insert(knowledgeComponents)
          .values({
            topicId,
            slug: node.id,
            name: node.label,
            description: node.type ?? null,
            createdAt: now,
          })
          .returning({ id: knowledgeComponents.id });
        kcId = inserted[0]!.id;
        counts.knowledge_components.inserted++;
      }

      kcSlugToId.set(node.id, kcId);
    }
  }

  // -------------------------------------------------------------------------
  // 3. Upsert content items from all three stages
  // -------------------------------------------------------------------------
  const stageNames = ['encounter', 'analysis', 'return'] as const;

  for (const stageName of stageNames) {
    const stage = topicYaml.stages[stageName];
    if (!stage) continue;

    for (const item of stage.contentItems) {
      const itemSlug = item.id;
      const mediaTypes = collectMediaTypes(item);
      const bloom = deriveBloomLevel(item, topicYaml.learningObjectives, stageName);
      const hemisphere = hemisphereMode(item.metadata?.hemisphere);
      const difficulty = difficultyLevel(item.metadata?.difficulty);

      // Use a composite slug to identify the item: topicSlug + ':' + itemId
      const itemSimilarityTags = [topicSlug, stageName, item.type, itemSlug];

      // Find existing content item for this topic/stage whose similarity_tags
      // includes the item's unique slug (set at insert time).
      const existingFull = await db
        .select({
          id: contentItems.id,
          similarityTags: contentItems.similarityTags,
        })
        .from(contentItems)
        .where(
          and(
            eq(contentItems.topicId, topicId),
            eq(contentItems.stage, stageName)
          )
        );

      const matchedItem = existingFull.find((row) =>
        row.similarityTags.includes(itemSlug)
      );

      let contentItemId: string;

      const itemValues = {
        topicId,
        itemType: item.type,
        stage: stageName,
        hemisphereMode: hemisphere,
        difficultyLevel: difficulty,
        bloomLevel: bloom,
        noviceSuitable: difficulty <= 1,
        advancedSuitable: difficulty >= 3,
        body: item as unknown as Record<string, unknown>,
        mediaTypes,
        estimatedDurationS: item.duration ?? 30,
        isReviewable: isReviewable(item),
        reviewFormat: reviewFormat(item),
        similarityTags: itemSimilarityTags,
        interleaveEligible: stageName === 'analysis',
        autoScorable: isAutoScorable(item),
        language: 'en',
        updatedAt: now,
      };

      if (matchedItem) {
        await db
          .update(contentItems)
          .set(itemValues)
          .where(eq(contentItems.id, matchedItem.id));
        contentItemId = matchedItem.id;
        counts.content_items.updated++;
      } else {
        const inserted = await db
          .insert(contentItems)
          .values({ ...itemValues, isActive: true, version: 1, createdAt: now })
          .returning({ id: contentItems.id });
        contentItemId = inserted[0]!.id;
        counts.content_items.inserted++;
      }

      // -----------------------------------------------------------------------
      // 4. Upsert content_item_kcs
      // -----------------------------------------------------------------------
      const tags = collectInteractionTags(item);

      for (const tag of tags) {
        const kcId = kcSlugToId.get(tag);
        if (!kcId) {
          // Tag doesn't match a KC — skip
          counts.content_item_kcs.skipped++;
          continue;
        }

        const existingLink = await db
          .select()
          .from(contentItemKcs)
          .where(
            and(
              eq(contentItemKcs.contentItemId, contentItemId),
              eq(contentItemKcs.kcId, kcId)
            )
          );

        if (existingLink.length > 0) {
          counts.content_item_kcs.skipped++;
        } else {
          await db.insert(contentItemKcs).values({ contentItemId, kcId });
          counts.content_item_kcs.inserted++;
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface CLIOptions {
  file?: string;
  dir?: string;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith('--file=')) {
      options.file = arg.slice('--file='.length);
    } else if (arg === '--file' && args[i + 1]) {
      options.file = args[++i];
    } else if (arg.startsWith('--dir=')) {
      options.dir = arg.slice('--dir='.length);
    } else if (arg === '--dir' && args[i + 1]) {
      options.dir = args[++i];
    }
  }

  return options;
}

function printSummary(counts: SeedCounts): void {
  const tables = [
    'topics',
    'knowledge_components',
    'content_items',
    'content_item_kcs',
  ] as const;

  console.log('\n' + '='.repeat(65));
  console.log('SEED SUMMARY');
  console.log('='.repeat(65));
  console.log(
    `${'Table'.padEnd(28)} ${'Inserted'.padStart(8)} ${'Updated'.padStart(8)} ${'Skipped'.padStart(8)}`
  );
  console.log('-'.repeat(65));

  for (const table of tables) {
    const c = counts[table];
    console.log(
      `${table.padEnd(28)} ${String(c.inserted).padStart(8)} ${String(c.updated).padStart(8)} ${String(c.skipped).padStart(8)}`
    );
  }

  console.log('='.repeat(65) + '\n');
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DATABASE_URL environment variable is required.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const options = parseArgs(args);

  // Determine files to seed
  let yamlFiles: string[] = [];
  const cwd = process.cwd();

  if (options.file) {
    const resolved = path.resolve(cwd, options.file);
    if (!fs.existsSync(resolved)) {
      console.error(`Error: File not found: ${resolved}`);
      process.exit(1);
    }
    yamlFiles = [resolved];
  } else {
    const dir = options.dir ? path.resolve(cwd, options.dir) : path.join(cwd, 'content');
    if (!fs.existsSync(dir)) {
      console.error(`Error: Directory not found: ${dir}`);
      process.exit(1);
    }
    yamlFiles = await glob('**/*.{yaml,yml}', {
      cwd: dir,
      ignore: ['**/node_modules/**'],
      absolute: true,
    });
  }

  if (yamlFiles.length === 0) {
    console.log('No YAML files found. Nothing to seed.');
    process.exit(0);
  }

  console.log(`\nSeeding ${yamlFiles.length} YAML file(s)...`);

  // Connect to DB
  const client = postgres(connectionString);
  const db = drizzle(client);

  const counts: SeedCounts = {
    topics: zeroCounts(),
    knowledge_components: zeroCounts(),
    content_items: zeroCounts(),
    content_item_kcs: zeroCounts(),
  };

  let filesProcessed = 0;
  let filesFailed = 0;

  for (const filePath of yamlFiles) {
    const relPath = path.relative(cwd, filePath);
    console.log(`  Processing: ${relPath}`);

    let contentFile: ContentFile;
    try {
      contentFile = loadYaml(filePath);
    } catch (err) {
      console.error(`  Failed to load ${relPath}: ${err instanceof Error ? err.message : String(err)}`);
      filesFailed++;
      continue;
    }

    if (!contentFile.topics || !Array.isArray(contentFile.topics)) {
      console.error(`  Skipping ${relPath}: no topics array found.`);
      filesFailed++;
      continue;
    }

    for (const topicYaml of contentFile.topics) {
      try {
        await seedTopic(db, topicYaml, counts);
        console.log(`  Seeded topic: ${topicYaml.id}`);
      } catch (err) {
        console.error(
          `  Failed to seed topic '${topicYaml.id}' from ${relPath}: ${err instanceof Error ? err.message : String(err)}`
        );
        filesFailed++;
      }
    }

    filesProcessed++;
  }

  printSummary(counts);

  if (filesFailed > 0) {
    console.error(`Completed with errors: ${filesFailed} file(s) failed.\n`);
  } else {
    console.log(`Done. ${filesProcessed} file(s) processed successfully.\n`);
  }

  await client.end();
  process.exit(filesFailed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
