import type { MessageContextMenuCommandInteraction } from 'discord.js';

import { type ApplicationCommandRegistry, Command } from '@sapphire/framework';
import { ApplicationCommandType, EmbedBuilder } from 'discord.js';

const STARBOARD_CHANNEL_ID = '1453158565618515978';

export class StarCommand extends Command {
  constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Star a message to save it to the starboard',
      name: 'Star',
    });
  }

  override async contextMenuRun(
    interaction: MessageContextMenuCommandInteraction,
  ) {
    const member = interaction.member;

    if (!member || !('roles' in member)) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    const hasVipRole = member.roles.cache.some((role) => role.name === 'ВИП');

    if (!hasVipRole) {
      await interaction.reply({
        content: '❌ You need the **ВИП** role to star messages.',
        ephemeral: true,
      });
      return;
    }

    const message = interaction.targetMessage;

    const starboardChannel = await interaction.client.channels.fetch(
      STARBOARD_CHANNEL_ID,
    );

    if (!starboardChannel?.isSendable()) {
      await interaction.reply({
        content: '❌ Could not find the starboard channel.',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setAuthor({
        iconURL: message.author.displayAvatarURL(),
        name: message.author.tag,
      })
      .setDescription(message.content || '*No text content*')
      .setTimestamp(message.createdAt)
      .setColor(0xffac33)
      .addFields({
        name: 'Source',
        value: `[Jump to message](${message.url})`,
      })
      .setFooter({
        text: `⭐ Starred by ${interaction.user.tag}`,
      });

    if (message.attachments.size > 0) {
      const firstImage = message.attachments.find((att) =>
        att.contentType?.startsWith('image/'),
      );
      if (firstImage) {
        embed.setImage(firstImage.url);
      }
    }

    await starboardChannel.send({ embeds: [embed] });

    await interaction.reply({
      content: '⭐ Message has been starred!',
      ephemeral: true,
    });
  }

  override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerContextMenuCommand((builder) =>
      builder.setName(this.name).setType(ApplicationCommandType.Message),
    );
  }
}
