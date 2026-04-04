import { Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';

import { formatDuration, TIMEOUT_PRESETS } from '@/constants/timeout.js';

export class TimeoutCommand extends Command {
  constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Timeout yourself for a specified duration',
      name: 'timeout',
      requiredClientPermissions: [PermissionFlagsBits.ModerateMembers],
      requiredUserPermissions: [PermissionFlagsBits.SendMessages],
      runIn: [CommandOptionsRunTypeEnum.GuildAny],
    });
  }

  override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    if (!interaction.inCachedGuild()) {
      return;
    }

    const rawMinutes = interaction.options.getInteger('duration', true);
    const member = interaction.member;

    if (!member.moderatable) {
      await interaction.reply({
        content:
          "❌ I can't timeout you. You may have higher permissions than me.",
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const minutes =
      rawMinutes === -1 ? Math.floor(Math.random() * 1_440) + 1 : rawMinutes;

    const preset = TIMEOUT_PRESETS.find((p) => p.minutes === minutes);
    const durationMs = minutes * 60 * 1_000;
    const durationLabel = preset?.label ?? formatDuration(minutes);

    await member.timeout(durationMs, 'Self-requested timeout');

    await interaction.reply({
      content: `🔇 You've been timed out for **${durationLabel}**. See you later!`,
      flags: [MessageFlags.Ephemeral],
    });
  }

  override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .setContexts(InteractionContextType.Guild)
        .addIntegerOption((option) =>
          option
            .setName('duration')
            .setDescription('How long to timeout yourself')
            .setRequired(true)
            .addChoices(
              ...TIMEOUT_PRESETS.map((preset) => ({
                name: preset.label,
                value: preset.minutes,
              })),
              { name: 'Random (1 min - 1 day)', value: -1 },
            ),
        ),
    );
  }
}
