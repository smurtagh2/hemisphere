import { sql } from 'drizzle-orm';
import { index, integer, pgTable, primaryKey, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';
import { contentItems } from './content-items';
import { knowledgeComponents } from './topics';

export const fsrsMemoryState = pgTable(
  'fsrs_memory_state',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id').notNull().references(() => contentItems.id, { onDelete: 'cascade' }),
    kcId: uuid('kc_id').notNull().references(() => knowledgeComponents.id),
    stability: real('stability').notNull().default(1),
    difficulty: real('difficulty').notNull().default(0.5),
    retrievability: real('retrievability').notNull().default(1),
    stageType: text('stage_type').notNull(),
    lastReview: timestamp('last_review', { withTimezone: true }),
    nextReview: timestamp('next_review', { withTimezone: true }),
    reviewCount: integer('review_count').notNull().default(0),
    lapseCount: integer('lapse_count').notNull().default(0),
    state: text('state').notNull().default('new'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.itemId] }),
    nextReviewIdx: index('idx_fsrs_next_review').on(table.userId, table.nextReview),
    stateIdx: index('idx_fsrs_state').on(table.userId, table.state),
    kcIdx: index('idx_fsrs_kc').on(table.kcId),
  })
);

export const fsrsParameters = pgTable('fsrs_parameters', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  weights: real('weights')
    .array()
    .notNull()
    .default(
      sql`ARRAY[
        0.4072, 1.1829, 3.1262, 15.4722,
        7.2102, 0.5316, 1.0651, 0.0,
        1.5546, 0.1192, 1.0100, 1.9395,
        0.1100, 0.2939, 2.0091, 0.2415,
        2.9898, 0.5100, 0.6000
      ]::real[]`
    ),
  targetRetention: real('target_retention').notNull().default(0.9),
  optimizedAt: timestamp('optimized_at', { withTimezone: true }),
  reviewCount: integer('review_count').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
