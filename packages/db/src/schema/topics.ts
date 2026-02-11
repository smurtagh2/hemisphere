import {
  type AnyPgColumn,
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const topics = pgTable('topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  topicPath: text('topic_path').array().notNull(),
  parentTopicId: uuid('parent_topic_id').references((): AnyPgColumn => topics.id),
  sortOrder: integer('sort_order').notNull().default(0),
  isPublished: boolean('is_published').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const knowledgeComponents = pgTable(
  'knowledge_components',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    topicSlugUnique: unique().on(table.topicId, table.slug),
  })
);

export const kcPrerequisites = pgTable(
  'kc_prerequisites',
  {
    kcId: uuid('kc_id').notNull().references(() => knowledgeComponents.id, { onDelete: 'cascade' }),
    prerequisiteId: uuid('prerequisite_id')
      .notNull()
      .references(() => knowledgeComponents.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.kcId, table.prerequisiteId] }),
  })
);
