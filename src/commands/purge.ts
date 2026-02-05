import { Command } from '@sapphire/framework';
import {
  type ChatInputCommandInteraction,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';

const MAX_BULK_DELETE = 100;
const MIN_BULK_DELETE = 1;

export class PurgeCommand extends Command {
  constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Bulk delete messages from the channel',
      name: 'purge',
    });
  }

  override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const count = interaction.options.getInteger('count', true);
    const channel = interaction.channel;

    if (!channel?.isTextBased() || channel.isDMBased()) {
      await interaction.reply({
        content: '❌ This command can only be used in a guild text channel.',
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    try {
      const deleted = await channel.bulkDelete(count, true);

      await interaction.editReply({
        content: `🗑️ Deleted **${deleted.size}** message${deleted.size === 1 ? '' : 's'}.${deleted.size < count ? ` (${count - deleted.size} messages were older than 14 days and could not be deleted)` : ''}`,
      });
    } catch {
      await interaction.editReply({
        content:
          '❌ Failed to delete messages. Make sure I have the required permissions.',
      });
    }
  }

  override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setContexts(InteractionContextType.Guild)
        .addIntegerOption((option) =>
          option
            .setName('count')
            .setDescription('Number of messages to delete (1-100)')
            .setRequired(true)
            .setMinValue(MIN_BULK_DELETE)
            .setMaxValue(MAX_BULK_DELETE),
        ),
    );
  }
}
