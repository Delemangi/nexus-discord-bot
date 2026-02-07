import { Command } from '@sapphire/framework';
import {
  ChannelType,
  type ChatInputCommandInteraction,
  type Guild,
  GuildPremiumTier,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  time,
  TimestampStyles,
  userMention,
} from 'discord.js';

const countChannelsByType = (guild: Guild) => {
  const channels = guild.channels.cache;

  return {
    announcement: channels.filter(
      (c) => c.type === ChannelType.GuildAnnouncement,
    ).size,
    category: channels.filter((c) => c.type === ChannelType.GuildCategory).size,
    forum: channels.filter((c) => c.type === ChannelType.GuildForum).size,
    media: channels.filter((c) => c.type === ChannelType.GuildMedia).size,
    stage: channels.filter((c) => c.type === ChannelType.GuildStageVoice).size,
    text: channels.filter((c) => c.type === ChannelType.GuildText).size,
    voice: channels.filter((c) => c.type === ChannelType.GuildVoice).size,
  };
};

const formatBoostTier = (tier: GuildPremiumTier): string => {
  switch (tier) {
    case GuildPremiumTier.None:
      return '0';
    case GuildPremiumTier.Tier1:
      return '1';
    case GuildPremiumTier.Tier2:
      return '2';
    case GuildPremiumTier.Tier3:
      return '3';
    default:
      return 'Unknown';
  }
};

const getEmojiLimit = (tier: GuildPremiumTier): number => {
  switch (tier) {
    case GuildPremiumTier.None:
      return 50;
    case GuildPremiumTier.Tier1:
      return 100;
    case GuildPremiumTier.Tier2:
      return 150;
    case GuildPremiumTier.Tier3:
      return 250;
    default:
      return 50;
  }
};

const getSoundboardLimit = (tier: GuildPremiumTier): number => {
  switch (tier) {
    case GuildPremiumTier.None:
      return 8;
    case GuildPremiumTier.Tier1:
      return 24;
    case GuildPremiumTier.Tier2:
      return 36;
    case GuildPremiumTier.Tier3:
      return 48;
    default:
      return 8;
  }
};

const getStickerLimit = (tier: GuildPremiumTier): number => {
  switch (tier) {
    case GuildPremiumTier.None:
      return 5;
    case GuildPremiumTier.Tier1:
      return 15;
    case GuildPremiumTier.Tier2:
      return 30;
    case GuildPremiumTier.Tier3:
      return 60;
    default:
      return 5;
  }
};

export class StatisticsCommand extends Command {
  constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'View server statistics',
      name: 'statistics',
    });
  }

  override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const { guild } = interaction;

    if (!guild) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    await interaction.deferReply();

    const [fetchedGuild, invites] = await Promise.all([
      guild.fetch(),
      guild.invites.fetch().catch(() => null),
    ]);

    const channelCounts = countChannelsByType(fetchedGuild);
    const totalChannels = fetchedGuild.channels.cache.filter(
      (c) => !c.isThread(),
    ).size;
    const maxChannels = 500;

    const emojis = fetchedGuild.emojis.cache;
    const staticEmojis = emojis.filter((e) => !e.animated).size;
    const animatedEmojis = emojis.filter((e) => e.animated).size;

    const stickers = fetchedGuild.stickers.cache.size;
    const roles = fetchedGuild.roles.cache.size;
    const maxRoles = 250;

    const emojiLimit = getEmojiLimit(fetchedGuild.premiumTier);
    const stickerLimit = getStickerLimit(fetchedGuild.premiumTier);
    const soundboardLimit = getSoundboardLimit(fetchedGuild.premiumTier);

    const lines: string[] = [
      `**Server Statistics for ${fetchedGuild.name}**`,
      '',
      '**General**',
      `Owner: ${userMention(fetchedGuild.ownerId)}`,
      `Created: ${time(fetchedGuild.createdAt, TimestampStyles.RelativeTime)}`,
      `Verification Level: ${fetchedGuild.verificationLevel}`,
      `Explicit Content Filter: ${fetchedGuild.explicitContentFilter}`,
      '',
      '**Members**',
      `Members: ${fetchedGuild.memberCount.toLocaleString()} / ${fetchedGuild.maximumMembers?.toLocaleString() ?? 'Unknown'}`,
      `Max Presences: ${fetchedGuild.maximumPresences?.toLocaleString() ?? 'Unlimited'}`,
      '',
      '**Boosts**',
      `Boosts: ${fetchedGuild.premiumSubscriptionCount ?? 0}`,
      `Level: ${formatBoostTier(fetchedGuild.premiumTier)}`,
      `Boosters: ${fetchedGuild.members.cache.filter((m) => m.premiumSince !== null).size}`,
      '',
      `**Channels (${totalChannels} / ${maxChannels})**`,
      `Text: ${channelCounts.text}`,
      `Voice: ${channelCounts.voice}`,
      `Categories: ${channelCounts.category}`,
      `Announcement: ${channelCounts.announcement}`,
      `Stage: ${channelCounts.stage}`,
      `Forum: ${channelCounts.forum}`,
      `Media: ${channelCounts.media}`,
      '',
      '**Roles**',
      `Roles: ${roles} / ${maxRoles}`,
      '',
      '**Emojis & Stickers**',
      `Static Emojis: ${staticEmojis} / ${emojiLimit}`,
      `Animated Emojis: ${animatedEmojis} / ${emojiLimit}`,
      `Stickers: ${stickers} / ${stickerLimit}`,
      `Soundboard Slots: ${soundboardLimit}`,
      '',
      '**Other**',
      `Invites: ${invites?.size ?? 'Unable to fetch'}`,
      `AFK Channel: ${fetchedGuild.afkChannel?.name ?? 'None'}`,
      `AFK Timeout: ${fetchedGuild.afkTimeout / 60} minutes`,
      `System Channel: ${fetchedGuild.systemChannel?.name ?? 'None'}`,
      `Rules Channel: ${fetchedGuild.rulesChannel?.name ?? 'None'}`,
      `Vanity URL: ${fetchedGuild.vanityURLCode ?? 'None'}`,
      `Description: ${fetchedGuild.description ?? 'None'}`,
      `Preferred Locale: ${fetchedGuild.preferredLocale}`,
      `NSFW Level: ${fetchedGuild.nsfwLevel}`,
      `MFA Level: ${fetchedGuild.mfaLevel}`,
    ];

    const features = fetchedGuild.features;
    if (features.length > 0) {
      lines.push(
        '',
        '**Features**',
        features.map((f) => `\`${f}\``).join(', '),
      );
    }

    await interaction.editReply({
      allowedMentions: { parse: [] },
      content: lines.join('\n'),
    });
  }

  override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .setContexts(InteractionContextType.Guild),
    );
  }
}
