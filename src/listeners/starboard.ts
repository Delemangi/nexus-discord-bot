import { Listener } from '@sapphire/framework';
import {
  Events,
  hyperlink,
  type MessageReaction,
  type PartialMessageReaction,
} from 'discord.js';
import { and, eq } from 'drizzle-orm';

import { STAR_EMOJI } from '../constants/starboard.js';
import { db } from '../db/index.js';
import { guildConfig, starboardMessages } from '../db/schema.js';
import { logger } from '../logger/index.js';

export class StarboardListener extends Listener {
  constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.MessageReactionAdd,
    });
  }

  async run(partialReaction: MessageReaction | PartialMessageReaction) {
    if (!partialReaction.message.guild) return;

    let reaction: MessageReaction;
    if (partialReaction.partial) {
      try {
        reaction = await partialReaction.fetch();
      } catch (error) {
        logger.error('Failed to fetch reaction:', error);
        return;
      }
    } else {
      reaction = partialReaction;
    }

    if (reaction.emoji.name !== STAR_EMOJI) return;

    const { count: starCount, message: reactionMessage } = reaction;
    const { guild, partial: isPartialMessage } = reactionMessage;
    if (!guild) return;

    const guildId = guild.id;

    const config = db
      .select()
      .from(guildConfig)
      .where(eq(guildConfig.guildId, guildId))
      .get();

    if (!config?.starboardChannelId) return;

    const { starboardChannelId, starboardThreshold } = config;
    const threshold = starboardThreshold ?? 3;

    if (starCount < threshold) return;

    const message = isPartialMessage
      ? await reactionMessage.fetch()
      : reactionMessage;

    if (message.channelId === starboardChannelId) return;

    const existingEntry = db
      .select()
      .from(starboardMessages)
      .where(
        and(
          eq(starboardMessages.guildId, guildId),
          eq(starboardMessages.originalMessageId, message.id),
        ),
      )
      .get();

    if (existingEntry) {
      return;
    }

    const starboardChannel = await guild.channels.fetch(starboardChannelId);

    if (!starboardChannel?.isSendable()) {
      logger.error(`Starboard channel ${starboardChannelId} is not sendable`);
      return;
    }

    const files = message.attachments.map((attachment) => attachment.url);

    const header = `${message.author.toString()} in <#${message.channelId}> (${hyperlink('jump', message.url)})`;
    const quote = message.content
      ? `> ${message.content.split('\n').join('\n> ')}`
      : '';

    const contentParts = [header, quote].filter(Boolean);
    const content = contentParts.join('\n');

    try {
      const starboardMsg = await starboardChannel.send({
        allowedMentions: { parse: [] },
        content,
        files,
      });

      await db.insert(starboardMessages).values({
        guildId,
        originalChannelId: message.channelId,
        originalMessageId: message.id,
        starboardMessageId: starboardMsg.id,
        starCount,
      });

      logger.info(
        `Created starboard entry for message ${message.id} in guild ${guildId}`,
      );
    } catch (error) {
      logger.error('Failed to create starboard message:', error);
    }
  }
}
