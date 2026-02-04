import { Command } from '@sapphire/framework';
import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';

const TIMEOUT_PRESETS = [
  { label: '1 minute', minutes: 1 },
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '4 hours', minutes: 240 },
  { label: '8 hours', minutes: 480 },
  { label: '1 day', minutes: 1_440 },
] as const;

export class TimeoutCommand extends Command {
  constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Timeout yourself for a specified duration',
      name: 'timeout',
    });
  }

  override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const minutes = interaction.options.getInteger('duration', true);
    const member = interaction.member;

    if (!member.moderatable) {
      await interaction.reply({
        content:
          "❌ I can't timeout you. You may have higher permissions than me.",
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const preset = TIMEOUT_PRESETS.find((p) => p.minutes === minutes);
    const durationMs = minutes * 60 * 1_000;

    await member.timeout(durationMs, 'Self-requested timeout');

    await interaction.reply({
      content: `🔇 You've been timed out for **${preset?.label ?? `${minutes} minutes`}**. See you later!`,
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
            ),
        ),
    );
  }
}
