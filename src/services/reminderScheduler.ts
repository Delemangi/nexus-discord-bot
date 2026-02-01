import type { Client } from 'discord.js';

import { eq, lte } from 'drizzle-orm';

import { db } from '../db/index.js';
import { reminders } from '../db/schema.js';
import { logger } from '../logger/index.js';

const CHECK_INTERVAL = 10_000;

const processReminders = async (client: Client) => {
  const now = new Date();

  const dueReminders = await db
    .select()
    .from(reminders)
    .where(lte(reminders.remindAt, now));

  for (const reminder of dueReminders) {
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
  }
};

export const startReminderScheduler = (client: Client) => {
  setInterval(async () => {
    await processReminders(client);
  }, CHECK_INTERVAL);

  void processReminders(client);
};
