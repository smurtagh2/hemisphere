import { sql } from 'drizzle-orm';
import { jsonb, pgTable, real, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';
import { contentItems } from './content-items';
import { knowledgeComponents } from './topics';

export const remediationQueue = pgTable(
  'remediation_queue',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => contentItems.id, { onDelete: 'cascade' }),
    kcId: uuid('kc_id')
      .notNull()
      .references(() => knowledgeComponents.id, { onDelete: 'cascade' }),
    detectionType: text('detection_type').notNull().default('zombie_item'),
    zombieScore: real('zombie_score').notNull().default(0),
    signals: jsonb('signals').notNull().default(sql`'{}'::jsonb`),
    remediationType: text('remediation_type').notNull(),
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => ({
    userItemDetectionUnique: uniqueIndex('remediation_queue_user_item_detection_unique').on(
      table.userId,
      table.itemId,
      table.detectionType
    ),
  })
);
