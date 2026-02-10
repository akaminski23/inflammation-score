import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const entries = sqliteTable('entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull().unique(),
  sleep: integer('sleep').notNull(),
  stress: integer('stress').notNull(),
  diet: integer('diet').notNull(),
  exercise: integer('exercise').notNull(),
  score: integer('score').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
