import { integer, pgTable, primaryKey, real, smallint, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';
import { knowledgeComponents, topics } from './topics';

export const learnerKcState = pgTable(
  'learner_kc_state',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    kcId: uuid('kc_id').notNull().references(() => knowledgeComponents.id, { onDelete: 'cascade' }),
    masteryLevel: real('mastery_level').notNull().default(0),
    difficultyTier: smallint('difficulty_tier').notNull().default(1),
    lhAccuracy: real('lh_accuracy').notNull().default(0),
    lhAttempts: integer('lh_attempts').notNull().default(0),
    lhLastAccuracy: real('lh_last_accuracy').notNull().default(0),
    rhScore: real('rh_score').notNull().default(0),
    rhAttempts: integer('rh_attempts').notNull().default(0),
    rhLastScore: real('rh_last_score').notNull().default(0),
    integratedScore: real('integrated_score').notNull().default(0),
    firstEncountered: timestamp('first_encountered', { withTimezone: true }),
    lastPracticed: timestamp('last_practiced', { withTimezone: true }),
    lastAssessedLh: timestamp('last_assessed_lh', { withTimezone: true }),
    lastAssessedRh: timestamp('last_assessed_rh', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.kcId] }),
  })
);

export const learnerTopicProficiency = pgTable(
  'learner_topic_proficiency',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
    overallProficiency: real('overall_proficiency').notNull().default(0),
    kcCount: integer('kc_count').notNull().default(0),
    kcMastered: integer('kc_mastered').notNull().default(0),
    kcInProgress: integer('kc_in_progress').notNull().default(0),
    kcNotStarted: integer('kc_not_started').notNull().default(0),
    encounterEngagement: real('encounter_engagement').notNull().default(0),
    analysisAccuracy: real('analysis_accuracy').notNull().default(0),
    returnQuality: real('return_quality').notNull().default(0),
    lastSession: timestamp('last_session', { withTimezone: true }),
    sessionsCompleted: integer('sessions_completed').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.topicId] }),
  })
);
