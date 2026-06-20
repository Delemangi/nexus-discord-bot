import { Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import {
  DiscordAPIError,
  type GuildMember,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  time,
  TimestampStyles,
} from 'discord.js';
import { and, eq } from 'drizzle-orm';

import { db } from '../db/index.js';
import { reminders } from '../db/schema.js';

export class AdminRemindersCommand extends Command {
  constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'View reminders for any user (admin only)',
      name: 'admin-reminders',
      requiredUserPermissions: [PermissionFlagsBits.Administrator],
      runIn: [CommandOptionsRunTypeEnum.GuildAny],
    });
  }

  override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const { guild, options } = interaction;

    if (guild === null) {
      return;
    }

    const user = options.getUser('user', true);

    let guildMember: GuildMember | null = null;

    try {
      guildMember = await guild.members.fetch(user.id);
    } catch (error) {
      if (
        !(
          error instanceof DiscordAPIError &&
          error.code === RESTJSONErrorCodes.UnknownMember
        )
      ) {
        throw error;
      }
    }

    if (guildMember === null) {
      await interaction.reply({
        content: `❌ That user is not a member of this server.`,
        flags: [MessageFlags.Ephemeral],
      });

      return;
    }

    const userReminders = await db
      .select()
      .from(reminders)
      .where(
        and(eq(reminders.userId, user.id), eq(reminders.guildId, guild.id)),
      )
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
        .setContexts(InteractionContextType.Guild)
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('The user to check reminders for')
            .setRequired(true),
        ),
    );
  }
}
