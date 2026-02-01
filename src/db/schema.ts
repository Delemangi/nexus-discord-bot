import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const reminders = sqliteTable('reminders', {
  channelId: text('channel_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  guildId: text('guild_id'),
  id: integer('id').primaryKey({ autoIncrement: true }),
  message: text('message').notNull(),
  remindAt: integer('remind_at', { mode: 'timestamp' }).notNull(),
  userId: text('user_id').notNull(),
});

export type NewReminder = typeof reminders.$inferInsert;
export type Reminder = typeof reminders.$inferSelect;
