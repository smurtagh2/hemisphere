import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { topics, knowledgeComponents } from './topics';

export const contentItems = pgTable('content_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  version: integer('version').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  itemType: text('item_type').notNull(),
  stage: text('stage').notNull(),
  hemisphereMode: text('hemisphere_mode').notNull(),
  difficultyLevel: integer('difficulty_level').notNull(),
  bloomLevel: text('bloom_level').notNull(),
  noviceSuitable: boolean('novice_suitable').notNull().default(true),
  advancedSuitable: boolean('advanced_suitable').notNull().default(false),
  topicId: uuid('topic_id').notNull().references(() => topics.id),
  body: jsonb('body').notNull(),
  mediaTypes: text('media_types').array().notNull().default([]),
  estimatedDurationS: integer('estimated_duration_s').notNull().default(30),
  fileSizeBytes: integer('file_size_bytes').notNull().default(0),
  isReviewable: boolean('is_reviewable').notNull().default(false),
  reviewFormat: text('review_format'),
  similarityTags: text('similarity_tags').array().notNull().default([]),
  interleaveEligible: boolean('interleave_eligible').notNull().default(false),
  assessmentType: text('assessment_type'),
  autoScorable: boolean('auto_scorable').notNull().default(true),
  rubricId: uuid('rubric_id'),
  altText: text('alt_text'),
  transcript: text('transcript'),
  language: text('language').notNull().default('en'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const contentItemKcs = pgTable(
  'content_item_kcs',
  {
    contentItemId: uuid('content_item_id')
      .notNull()
      .references(() => contentItems.id, { onDelete: 'cascade' }),
    kcId: uuid('kc_id').notNull().references(() => knowledgeComponents.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contentItemId, table.kcId] }),
  })
);
