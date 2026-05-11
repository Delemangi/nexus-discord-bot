import { CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { Subcommand } from '@sapphire/plugin-subcommands';
import {
  ChannelType,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  type SlashCommandChannelOption,
  type SlashCommandIntegerOption,
} from 'discord.js';
import { eq } from 'drizzle-orm';

import { db } from '../db/index.js';
import { guildConfig } from '../db/schema.js';

const configureChannelOption = (option: SlashCommandChannelOption) =>
  option
    .setName('channel')
    .setDescription('The channel for starboard messages')
    .addChannelTypes(ChannelType.GuildText)
    .setRequired(true);

const configureCountOption = (option: SlashCommandIntegerOption) =>
  option
    .setName('count')
    .setDescription('Number of stars required')
    .setMinValue(1)
    .setMaxValue(50)
    .setRequired(true);

export class ConfigCommand extends Subcommand {
  constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
    super(context, {
      ...options,
      description: 'Configure server settings',
      name: 'config',
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      runIn: [CommandOptionsRunTypeEnum.GuildAny],
      subcommands: [
        {
          entries: [
            { chatInputRun: 'chatInputStarboardChannel', name: 'channel' },
            { chatInputRun: 'chatInputStarboardThreshold', name: 'threshold' },
            { chatInputRun: 'chatInputStarboardDisable', name: 'disable' },
            { chatInputRun: 'chatInputStarboardStatus', name: 'status' },
          ],
          name: 'starboard',
          type: 'group',
        },
      ],
    });
  }

  async chatInputStarboardChannel(
    interaction: Subcommand.ChatInputCommandInteraction,
  ) {
    const channel = interaction.options.getChannel('channel', true);
    const { guildId } = interaction;
    if (!guildId) return;

    await db
      .insert(guildConfig)
      .values({
        guildId,
        starboardChannelId: channel.id,
      })
      .onConflictDoUpdate({
        set: {
          starboardChannelId: channel.id,
          updatedAt: new Date(),
        },
        target: guildConfig.guildId,
      });

    await interaction.reply({
      content: `✅ Starboard channel set to <#${channel.id}>`,
      flags: [MessageFlags.Ephemeral],
    });
  }

  async chatInputStarboardDisable(
    interaction: Subcommand.ChatInputCommandInteraction,
  ) {
    const { guildId } = interaction;
    if (!guildId) return;

    await db
      .update(guildConfig)
      .set({
        starboardChannelId: null,
        updatedAt: new Date(),
      })
      .where(eq(guildConfig.guildId, guildId));

    await interaction.reply({
      content: '✅ Starboard has been disabled.',
      flags: [MessageFlags.Ephemeral],
    });
  }

  async chatInputStarboardStatus(
    interaction: Subcommand.ChatInputCommandInteraction,
  ) {
    const { guildId } = interaction;
    if (!guildId) return;

    const config = db
      .select()
      .from(guildConfig)
      .where(eq(guildConfig.guildId, guildId))
      .get();

    if (!config?.starboardChannelId) {
      await interaction.reply({
        content:
          '📋 **Starboard Status**\n\n❌ Starboard is not configured.\n\nUse `/config starboard channel` to set it up.',
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    await interaction.reply({
      content: `📋 **Starboard Status**\n\n✅ **Enabled**\n📌 Channel: <#${config.starboardChannelId}>\n⭐ Threshold: **${config.starboardThreshold ?? 3}** stars`,
      flags: [MessageFlags.Ephemeral],
    });
  }

  async chatInputStarboardThreshold(
    interaction: Subcommand.ChatInputCommandInteraction,
  ) {
    const count = interaction.options.getInteger('count', true);
    const { guildId } = interaction;
    if (!guildId) return;

    await db
      .insert(guildConfig)
      .values({
        guildId,
        starboardThreshold: count,
      })
      .onConflictDoUpdate({
        set: {
          starboardThreshold: count,
          updatedAt: new Date(),
        },
        target: guildConfig.guildId,
      });

    await interaction.reply({
      content: `✅ Starboard threshold set to **${count}** stars`,
      flags: [MessageFlags.Ephemeral],
    });
  }

  override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setContexts(InteractionContextType.Guild)
        .addSubcommandGroup((group) =>
          group
            .setName('starboard')
            .setDescription('Configure starboard settings')
            .addSubcommand((subcommand) =>
              subcommand
                .setName('channel')
                .setDescription('Set the starboard channel')
                .addChannelOption(configureChannelOption),
            )
            .addSubcommand((subcommand) =>
              subcommand
                .setName('threshold')
                .setDescription(
                  'Set the minimum stars required for starboard (default: 3)',
                )
                .addIntegerOption(configureCountOption),
            )
            .addSubcommand((subcommand) =>
              subcommand
                .setName('disable')
                .setDescription('Disable the starboard'),
            )
            .addSubcommand((subcommand) =>
              subcommand
                .setName('status')
                .setDescription('View current starboard configuration'),
            ),
        ),
    );
  }
}
