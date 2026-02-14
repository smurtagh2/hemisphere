import { sql } from 'drizzle-orm';
import { integer, jsonb, pgTable, primaryKey, real, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
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

export const learnerBehavioralState = pgTable('learner_behavioral_state', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  totalSessions: integer('total_sessions').notNull().default(0),
  sessionsLast7Days: integer('sessions_last_7_days').notNull().default(0),
  sessionsLast30Days: integer('sessions_last_30_days').notNull().default(0),
  averageSessionDurationS: real('average_session_duration_s').notNull().default(0),
  sessionDurationTrend: real('session_duration_trend').notNull().default(0),
  preferredSessionTime: text('preferred_session_time').notNull().default('evening'),
  sessionCompletionRate: real('session_completion_rate').notNull().default(1),
  averageLatencyMs: real('average_latency_ms').notNull().default(0),
  latencyByType: jsonb('latency_by_type').notNull().default(sql`'{}'::jsonb`),
  latencyTrend: real('latency_trend').notNull().default(0),
  helpRequestRate: real('help_request_rate').notNull().default(0),
  helpTypeDistribution: jsonb('help_type_distribution').notNull().default(sql`'{}'::jsonb`),
  helpRequestTrend: real('help_request_trend').notNull().default(0),
  encounterTimeRatio: real('encounter_time_ratio').notNull().default(0.25),
  analysisTimeRatio: real('analysis_time_ratio').notNull().default(0.5),
  returnTimeRatio: real('return_time_ratio').notNull().default(0.25),
  encounterEngagementScore: real('encounter_engagement_score').notNull().default(0),
  returnEngagementScore: real('return_engagement_score').notNull().default(0),
  confidenceAccuracyCorr: real('confidence_accuracy_corr').notNull().default(0),
  calibrationGap: real('calibration_gap').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const learnerCognitiveProfile = pgTable('learner_cognitive_profile', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  hemisphereBalanceScore: real('hemisphere_balance_score').notNull().default(0),
  hbsHistory: jsonb('hbs_history').notNull().default(sql`'[]'::jsonb`),
  hbsTrend: real('hbs_trend').notNull().default(0),
  modalityPreferences: jsonb('modality_preferences')
    .notNull()
    .default(sql`'{"visual":0.25,"auditory":0.25,"textual":0.25,"kinesthetic":0.25}'::jsonb`),
  metacognitiveAccuracy: real('metacognitive_accuracy').notNull().default(0.5),
  metacognitiveTrend: real('metacognitive_trend').notNull().default(0),
  learningVelocity: real('learning_velocity').notNull().default(0),
  velocityByDifficulty: jsonb('velocity_by_difficulty').notNull().default(sql`'{}'::jsonb`),
  velocityTrend: real('velocity_trend').notNull().default(0),
  strongestAssessmentTypes: text('strongest_assessment_types').array().notNull().default([]),
  weakestAssessmentTypes: text('weakest_assessment_types').array().notNull().default([]),
  strongestTopics: text('strongest_topics').array().notNull().default([]),
  weakestTopics: text('weakest_topics').array().notNull().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const learnerMotivationalState = pgTable('learner_motivational_state', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  engagementTrend: text('engagement_trend').notNull().default('stable'),
  engagementScore: real('engagement_score').notNull().default(0.5),
  engagementHistory: jsonb('engagement_history').notNull().default(sql`'[]'::jsonb`),
  topicChoiceRate: real('topic_choice_rate').notNull().default(0),
  explorationRate: real('exploration_rate').notNull().default(0),
  preferredSessionType: text('preferred_session_type').notNull().default('standard'),
  challengeTolerance: real('challenge_tolerance').notNull().default(0.5),
  sessionAbandonmentRate: real('session_abandonment_rate').notNull().default(0),
  abandonmentStage: jsonb('abandonment_stage')
    .notNull()
    .default(sql`'{"encounter":0,"analysis":0,"return":0}'::jsonb`),
  lastActive: timestamp('last_active', { withTimezone: true }),
  daysSinceLastSession: integer('days_since_last_session').notNull().default(0),
  dropoutRisk: text('dropout_risk').notNull().default('low'),
  burnoutRisk: text('burnout_risk').notNull().default('low'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
