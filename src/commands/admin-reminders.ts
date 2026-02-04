import { Command } from '@sapphire/framework';
import {
  MessageFlags,
  PermissionFlagsBits,
  time,
  TimestampStyles,
} from 'discord.js';
import { eq } from 'drizzle-orm';

import { db } from '../db/index.js';
import { reminders } from '../db/schema.js';

export class AdminRemindersCommand extends Command {
  constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'View reminders for any user (admin only)',
      name: 'admin-reminders',
      requiredUserPermissions: [PermissionFlagsBits.Administrator],
    });
  }

  override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const user = interaction.options.getUser('user', true);

    const userReminders = await db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, user.id))
      .orderBy(reminders.remindAt);

    if (userReminders.length === 0) {
      await interaction.reply({
        content: `📭 ${user.tag} has no active reminders.`,
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const reminderList = userReminders
      .map((r, i) => {
        const relative = time(r.remindAt, TimestampStyles.RelativeTime);
        const channelMention = `<#${r.channelId}>`;
        return `**${i + 1}.** ${relative} in ${channelMention}\n> ${r.message}`;
      })
      .join('\n\n');

    await interaction.reply({
      content: `📋 **Reminders for ${user.tag}** (${userReminders.length})\n\n${reminderList}`,
      flags: [MessageFlags.Ephemeral],
    });
  }

  override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('The user to check reminders for')
            .setRequired(true),
        ),
    );
  }
}
