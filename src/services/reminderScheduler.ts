import type { Client } from 'discord.js';

import { eq, lte } from 'drizzle-orm';

import { CHECK_INTERVAL } from '@/constants/reminder.js';

import { db } from '../db/index.js';
import { reminders } from '../db/schema.js';
import { logger } from '../logger/index.js';

const processReminders = async (client: Client) => {
  const now = new Date();

  const dueReminders = await db
    .select()
    .from(reminders)
    .where(lte(reminders.remindAt, now));

  const pendingReminders = dueReminders.values();

  const processNextReminder = async (): Promise<void> => {
    const next = pendingReminders.next();

    if (next.done) return;

    const reminder = next.value;
    try {
      const content = `🔔 Reminder:\n> ${reminder.message}`;

      if (reminder.guildId === null) {
        const user = await client.users.fetch(reminder.userId);
        await user.send({ content });
      } else {
        const channel = await client.channels.fetch(reminder.channelId);

        if (channel?.isSendable()) {
          await channel.send({
            allowedMentions: { users: [reminder.userId] },
            content: `🔔 <@${reminder.userId}> Reminder:\n> ${reminder.message}`,
          });
        }
      }
    } catch (error) {
      logger.error(`Failed to send reminder ${reminder.id}:`, error);
    }

    await db.delete(reminders).where(eq(reminders.id, reminder.id));
    await processNextReminder();
  };

  await processNextReminder();
};

export const startReminderScheduler = (client: Client) => {
  setInterval(async () => {
    await processReminders(client);
  }, CHECK_INTERVAL);

  void processReminders(client);
};
