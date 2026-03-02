import {
  type ChatInputCommandSuccessPayload,
  Events,
  Listener,
} from '@sapphire/framework';

import { formatOptions } from '@/utils/logging.js';

import { logger } from '../logger/index.js';

export class CommandLoggingListener extends Listener {
  constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.ChatInputCommandSuccess,
    });
  }

  run(payload: ChatInputCommandSuccessPayload) {
    const { command, interaction } = payload;

    const guildName = interaction.guild?.name ?? 'DM';
    const guildId = interaction.guild?.id ?? 'N/A';
    const userId = interaction.user.id;
    const userTag = interaction.user.tag;

    logger.info(
      `/${command.name}${formatOptions(interaction.options.data)} by ${userTag} (${userId}) in ${guildName} (${guildId})`,
    );
  }
}
