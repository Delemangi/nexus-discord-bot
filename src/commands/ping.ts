import type { CommandInteraction } from 'discord.js';

import { type ApplicationCommandRegistry, Command } from '@sapphire/framework';

export class PingCommand extends Command {
  constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Replies with Pong!',
      name: 'ping',
    });
  }

  override async chatInputRun(interaction: CommandInteraction) {
    await interaction.reply('Pong!');
  }

  override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description),
    );
  }
}
