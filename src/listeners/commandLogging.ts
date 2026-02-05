import {
  type ChatInputCommandSuccessPayload,
  Events,
  Listener,
} from '@sapphire/framework';
import { type CommandInteractionOption } from 'discord.js';

import { logger } from '../logger/index.js';

const formatOption = (opt: CommandInteractionOption): string => {
  if (opt.options && opt.options.length > 0) {
    const nested = opt.options.map(formatOption).join(', ');
    return `${opt.name} [${nested}]`;
  }

  const value =
    opt.value ?? opt.channel?.name ?? opt.user?.tag ?? opt.role?.name;
  return `${opt.name}:${String(value)}`;
};

export class CommandLoggingListener extends Listener {
  constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.ChatInputCommandSuccess,
    });
  }

  run(payload: ChatInputCommandSuccessPayload) {
    const { command, interaction } = payload;

    const args = interaction.options.data.map(formatOption).join(', ');

    const guildName = interaction.guild?.name ?? 'DM';
    const guildId = interaction.guild?.id ?? 'N/A';
    const userId = interaction.user.id;
    const userTag = interaction.user.tag;

    logger.info(
      `/${command.name}${args ? ` [${args}]` : ''} by ${userTag} (${userId}) in ${guildName} (${guildId})`,
    );
  }
}
