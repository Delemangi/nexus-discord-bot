import { Subcommand } from '@sapphire/plugin-subcommands';
import * as chrono from 'chrono-node';
import { MessageFlags, time, TimestampStyles } from 'discord.js';
import { eq } from 'drizzle-orm';

import { buildDeleteButtons } from '@/components/reminder.js';

import { db } from '../db/index.js';
import { reminders } from '../db/schema.js';

export class ReminderCommand extends Subcommand {
  constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
    super(context, {
      ...options,
      description: 'Manage reminders',
      name: 'reminder',
      subcommands: [
        {
          chatInputRun: 'chatInputCreate',
          name: 'create',
        },
        {
          chatInputRun: 'chatInputList',
          name: 'list',
        },
        {
          chatInputRun: 'chatInputDelete',
          name: 'delete',
        },
      ],
    });
  }

  async chatInputCreate(interaction: Subcommand.ChatInputCommandInteraction) {
    const message = interaction.options.getString('message', true);
    const when = interaction.options.getString('when', true);

    const parsedDate = chrono.parseDate(when, new Date(), {
      forwardDate: true,
    });

    if (parsedDate === null) {
      await interaction.reply({
        content: `❌ I couldn't understand "${when}". Try something like "in 2 hours", "tomorrow at 3pm", or "next monday".`,
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    if (parsedDate.getTime() <= Date.now()) {
      await interaction.reply({
        content: '❌ The reminder time must be in the future.',
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    db.insert(reminders)
      .values({
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        message,
        remindAt: parsedDate,
        userId: interaction.user.id,
      })
      .run();

    const relative = time(parsedDate, TimestampStyles.RelativeTime);
    const full = time(parsedDate, TimestampStyles.LongDate);

    await interaction.reply({
      content: `✅ I'll remind you ${relative} (${full}):\n> ${message}`,
      flags: [MessageFlags.Ephemeral],
    });
  }

  async chatInputDelete(interaction: Subcommand.ChatInputCommandInteraction) {
    const userReminders = await db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, interaction.user.id))
      .orderBy(reminders.remindAt);

    if (userReminders.length === 0) {
      await interaction.reply({
        content: '📭 You have no reminders to delete.',
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    await interaction.reply({
      components: buildDeleteButtons(userReminders),
      content: '🗑️ Click a button to delete a reminder:',
      flags: [MessageFlags.Ephemeral],
    });
  }

  async chatInputList(interaction: Subcommand.ChatInputCommandInteraction) {
    const userReminders = await db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, interaction.user.id))
      .orderBy(reminders.remindAt);

    if (userReminders.length === 0) {
      await interaction.reply({
        content: '📭 You have no active reminders.',
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const reminderList = userReminders
      .map((r, i) => {
        const relative = time(r.remindAt, TimestampStyles.RelativeTime);
        return `**${i + 1}.** ${relative} - ${r.message}`;
      })
      .join('\n');

    await interaction.reply({
      content: `📋 **Your Reminders** (${userReminders.length})\n\n${reminderList}`,
      flags: [MessageFlags.Ephemeral],
    });
  }

  override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand((subcommand) =>
          subcommand
            .setName('create')
            .setDescription('Create a new reminder')
            .addStringOption((option) =>
              option
                .setName('message')
                .setDescription('What to remind you about')
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName('when')
                .setDescription(
                  'When to remind you (e.g., "in 2 hours", "tomorrow at 3pm", "next monday")',
                )
                .setRequired(true),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('list')
            .setDescription('List your active reminders'),
        )
        .addSubcommand((subcommand) =>
          subcommand.setName('delete').setDescription('Delete your reminders'),
        ),
    );
  }
}
