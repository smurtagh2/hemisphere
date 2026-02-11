import { boolean, integer, jsonb, pgTable, real, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';
import { topics } from './topics';
import { contentItems } from './content-items';
import { knowledgeComponents } from './topics';

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  topicId: uuid('topic_id').notNull().references(() => topics.id),
  sessionType: text('session_type').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  durationS: integer('duration_s'),
  encounterDurationS: integer('encounter_duration_s'),
  analysisDurationS: integer('analysis_duration_s'),
  returnDurationS: integer('return_duration_s'),
  plannedBalance: jsonb('planned_balance').notNull(),
  itemCount: integer('item_count').notNull().default(0),
  newItemCount: integer('new_item_count').notNull().default(0),
  reviewItemCount: integer('review_item_count').notNull().default(0),
  interleavedCount: integer('interleaved_count').notNull().default(0),
  accuracy: real('accuracy'),
  status: text('status').notNull().default('in_progress'),
  abandonedAtStage: text('abandoned_at_stage'),
  adaptiveDecisions: jsonb('adaptive_decisions'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const assessmentEvents = pgTable('assessment_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  contentItemId: uuid('content_item_id').notNull().references(() => contentItems.id),
  kcId: uuid('kc_id').references(() => knowledgeComponents.id),
  responseType: text('response_type').notNull(),
  learnerResponse: jsonb('learner_response').notNull(),
  isCorrect: boolean('is_correct'),
  score: real('score'),
  rawScore: real('raw_score'),
  scoringMethod: text('scoring_method').notNull().default('pending'),
  llmJustification: text('llm_justification'),
  presentedAt: timestamp('presented_at', { withTimezone: true }).notNull(),
  respondedAt: timestamp('responded_at', { withTimezone: true }).notNull(),
  latencyMs: integer('latency_ms').notNull(),
  stage: text('stage').notNull(),
  difficultyLevel: smallint('difficulty_level').notNull(),
  helpRequested: boolean('help_requested').notNull().default(false),
  helpType: text('help_type'),
  selfRating: text('self_rating'),
  confidenceRating: smallint('confidence_rating'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
