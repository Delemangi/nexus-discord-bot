import { CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { Subcommand } from '@sapphire/plugin-subcommands';
import {
  type ButtonInteraction,
  type ChannelType,
  InteractionContextType,
  type MessageComponentInteraction,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { and, eq, inArray } from 'drizzle-orm';

import type {
  AllowedLockdownChannelType,
  LockdownSelections,
} from '@/types/lockdown.js';

import {
  buildActivationComponent,
  buildReasonModal,
  buildStatusComponent,
} from '@/components/lockdown.js';
import {
  ALLOWED_LOCKDOWN_CHANNEL_TYPES,
  IDLE_LIMIT,
  LOCKDOWN_CUSTOM_ID,
  LOCKDOWN_TYPE,
} from '@/constants/lockdown.js';
import { db } from '@/db/index.js';
import { lockdownOverwrites, lockdownSessions } from '@/db/schema.js';
import { logger } from '@/logger/index.js';
import { buildLockdownChannelPlan, lockdownReason } from '@/utils/lockdown.js';

export class LockdownCommand extends Subcommand {
  constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
    super(context, {
      ...options,
      description: 'Lockdown command',
      name: 'lockdown',
      requiredClientPermissions: [PermissionFlagsBits.Administrator],
      requiredUserPermissions: [PermissionFlagsBits.Administrator],
      runIn: [CommandOptionsRunTypeEnum.GuildAny],
      subcommands: [
        {
          chatInputRun: 'chatInputActivate',
          name: 'activate',
        },
        {
          chatInputRun: 'chatInputDeactivate',
          name: 'deactivate',
        },
        {
          chatInputRun: 'chatInputStatus',
          name: 'status',
        },
      ],
    });
  }

  async chatInputActivate(interaction: Subcommand.ChatInputCommandInteraction) {
    const { guild, user } = interaction;

    if (guild === null) {
      return;
    }

    const lockdownSession = db
      .select()
      .from(lockdownSessions)
      .where(eq(lockdownSessions.guildId, guild.id))
      .get();

    if (lockdownSession !== undefined) {
      await interaction.reply({
        content: '❌ A lockdown is already active.',
        flags: [MessageFlags.Ephemeral],
      });

      return;
    }

    const lockdownResponse = await interaction.reply({
      components: [buildActivationComponent()],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });

    const selections: LockdownSelections = {};

    const collector = lockdownResponse.createMessageComponentCollector({
      filter: (i) => i.user.id === user.id,
      idle: IDLE_LIMIT,
    });

    collector.on('collect', async (i) => {
      switch (i.customId) {
        case LOCKDOWN_CUSTOM_ID.CancelButton:
          this.handleCancelButton(i, collector);
          break;
        case LOCKDOWN_CUSTOM_ID.CategorySelect:
          await this.handleCategorySelect(i, selections);
          break;
        case LOCKDOWN_CUSTOM_ID.ChannelSelect:
          await this.handleChannelSelect(i, selections);
          break;
        case LOCKDOWN_CUSTOM_ID.ConfirmButton:
          await this.handleConfirmButton(i, selections, {
            collector,
            commandInteraction: interaction,
          });
          break;
        case LOCKDOWN_CUSTOM_ID.ReasonButton:
          await this.handleReasonButton(i, selections);
          break;
        case LOCKDOWN_CUSTOM_ID.RoleSelect:
          await this.handleRoleSelect(i, selections);
          break;
        case LOCKDOWN_CUSTOM_ID.TypeSelect:
          await this.handleTypeSelect(i, selections);
          break;
        default:
          await this.handleUnknownInteraction(i);
          break;
      }
    });

    collector.on('end', async (_, reason) => {
      switch (reason) {
        case 'cancel':
        case 'idle':
          await interaction.deleteReply().catch(() => null);
          break;

        default:
          break;
      }
    });
  }

  async chatInputDeactivate(
    interaction: Subcommand.ChatInputCommandInteraction,
  ) {
    const { guild, user } = interaction;

    if (guild === null) {
      return;
    }

    const lockdownSession = db
      .select()
      .from(lockdownSessions)
      .where(eq(lockdownSessions.guildId, guild.id))
      .get();

    if (lockdownSession === undefined) {
      await interaction.reply({
        content: '❌ There is no active lockdown to deactivate.',
        flags: [MessageFlags.Ephemeral],
      });

      return;
    }

    await interaction.reply({
      content: '🔒 Deactivating lockdown...',
      flags: [MessageFlags.Ephemeral],
    });

    const savedOverwrites = db
      .select()
      .from(lockdownOverwrites)
      .where(eq(lockdownOverwrites.guildId, guild.id))
      .all();

    const allChannels = await guild.channels.fetch();

    const results = await Promise.allSettled(
      allChannels
        .filter(
          (channel): channel is NonNullable<typeof channel> =>
            channel !== null &&
            savedOverwrites.some((o) => o.channelId === channel.id),
        )
        .map(async (channel) => {
          await channel.permissionOverwrites.set(
            savedOverwrites
              .filter((overwrite) => overwrite.channelId === channel.id)
              .map((overwrite) => ({
                allow: BigInt(overwrite.allow),
                deny: BigInt(overwrite.deny),
                id: overwrite.overwriteId,
                type: overwrite.overwriteType,
              })),
            lockdownReason({
              ...(lockdownSession.reason !== null && {
                reason: lockdownSession.reason,
              }),
              type: 'deactivation',
              userId: user.id,
              username: user.username,
            }),
          );

          return channel.id;
        }),
    );

    const succeededChannelIds = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value);

    const failedCount = results.length - succeededChannelIds.length;

    if (failedCount > 0) {
      logger.error(
        `Failed to restore overwrites for ${failedCount} channel(s).`,
      );
    }

    try {
      await (failedCount === 0
        ? db
            .delete(lockdownSessions)
            .where(eq(lockdownSessions.guildId, guild.id))
        : db
            .delete(lockdownOverwrites)
            .where(
              and(
                eq(lockdownOverwrites.guildId, guild.id),
                inArray(lockdownOverwrites.channelId, succeededChannelIds),
              ),
            ));
    } catch (error) {
      logger.error('Failed to clean up lockdown session from database:', error);

      await interaction.editReply({
        content: '❌ Lockdown was lifted but failed to clean up the session.',
      });

      return;
    }

    await interaction.editReply({
      content:
        failedCount === 0
          ? '🔓 Lockdown deactivated.'
          : `⚠️ Lockdown partially deactivated. ${failedCount} channel(s) failed to restore and are still saved.`,
    });
  }

  async chatInputStatus(interaction: Subcommand.ChatInputCommandInteraction) {
    const { guild } = interaction;

    if (guild === null) {
      return;
    }

    const lockdownSession = db
      .select()
      .from(lockdownSessions)
      .where(eq(lockdownSessions.guildId, guild.id))
      .get();

    if (lockdownSession === undefined) {
      await interaction.reply({
        allowedMentions: { parse: [] },
        content: '❌ There is no active lockdown.',
        flags: [MessageFlags.Ephemeral],
      });

      return;
    }

    await interaction.reply({
      components: [buildStatusComponent(lockdownSession)],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
  }

  override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setContexts(InteractionContextType.Guild)
        .addSubcommand((command) =>
          command
            .setName('activate')
            .setDescription('Activate a lockdown for this server'),
        )
        .addSubcommand((command) =>
          command
            .setName('deactivate')
            .setDescription('Deactivate a lockdown for this server'),
        )
        .addSubcommand((command) =>
          command
            .setName('status')
            .setDescription(
              'Check the current lockdown status for this server',
            ),
        ),
    );
  }

  private async executeLockdown(
    interaction: ButtonInteraction,
    selections: LockdownSelections,
  ): Promise<boolean> {
    const lockdownType = selections.type;

    if (lockdownType === undefined) {
      await interaction.reply({
        content: '❌ Please select a lockdown type.',
        flags: [MessageFlags.Ephemeral],
      });

      return false;
    }

    const { guild, user } = interaction;

    if (guild === null) {
      return false;
    }

    const lockdownSession = db
      .select()
      .from(lockdownSessions)
      .where(eq(lockdownSessions.guildId, guild.id))
      .get();

    if (lockdownSession !== undefined) {
      await interaction.reply({
        content: '❌ A lockdown is already active.',
        flags: [MessageFlags.Ephemeral],
      });

      return false;
    }

    await interaction.reply({
      content: '🔓 Activating lockdown...',
      flags: [MessageFlags.Ephemeral],
    });

    const allChannels = await guild.channels.fetch();

    const allowedChannelTypes = new Set<ChannelType>(
      ALLOWED_LOCKDOWN_CHANNEL_TYPES,
    );
    const excludedCategories = new Set(selections.excludedCategories);
    const excludedChannels = new Set(selections.excludedChannels);
    const excludedRoles = new Set(selections.excludedRoles);

    const filteredChannels = allChannels.filter(
      (
        channel,
      ): channel is NonNullable<typeof channel> & {
        type: AllowedLockdownChannelType;
      } =>
        channel !== null &&
        allowedChannelTypes.has(channel.type) &&
        !excludedChannels.has(channel.id) &&
        (channel.parentId === null ||
          !excludedCategories.has(channel.parentId)),
    );

    const channelPlans = Array.from(filteredChannels.values(), (channel) =>
      buildLockdownChannelPlan({ channel, excludedRoles, guild, lockdownType }),
    );
    const overwriteRows = channelPlans.flatMap((plan) => plan.overwriteRows);

    if (overwriteRows.length === 0) {
      await interaction.editReply({
        content: '❌ No channels were affected by the lockdown.',
      });

      return false;
    }

    try {
      db.transaction((tx) => {
        tx.insert(lockdownSessions)
          .values({
            excludedCategories: selections.excludedCategories ?? [],
            excludedChannels: selections.excludedChannels ?? [],
            excludedRoles: selections.excludedRoles ?? [],
            guildId: guild.id,
            reason: selections.reason ?? null,
            type: lockdownType,
            userId: user.id,
          })
          .run();

        tx.insert(lockdownOverwrites).values(overwriteRows).run();
      });
    } catch (error) {
      logger.error('Failed to save lockdown session to database:', error);

      await interaction.editReply({
        content: '❌ Failed to save lockdown session.',
      });

      return false;
    }

    await Promise.allSettled(
      channelPlans.map(({ channel, newOverwrites }) =>
        channel.permissionOverwrites
          .set(
            newOverwrites,
            lockdownReason({
              ...(selections.reason !== undefined && {
                reason: selections.reason,
              }),
              type: 'activation',
              userId: user.id,
              username: user.username,
            }),
          )
          .catch((error: unknown) =>
            logger.error(
              `Failed to set overwrites for channel ${channel.id}:`,
              error,
            ),
          ),
      ),
    );

    await interaction.editReply({ content: '🔒 Lockdown activated.' });

    return true;
  }

  private handleCancelButton(
    interaction: MessageComponentInteraction,
    collector: { stop: (reason?: string) => void },
  ) {
    if (!interaction.isButton()) {
      return;
    }

    collector.stop('cancel');
  }

  private async handleCategorySelect(
    interaction: MessageComponentInteraction,
    selections: LockdownSelections,
  ) {
    if (!interaction.isChannelSelectMenu()) {
      return;
    }

    selections.excludedCategories = [...interaction.channels.keys()];

    await interaction.deferUpdate();
  }

  private async handleChannelSelect(
    interaction: MessageComponentInteraction,
    selections: LockdownSelections,
  ) {
    if (!interaction.isChannelSelectMenu()) {
      return;
    }

    selections.excludedChannels = [...interaction.channels.keys()];

    await interaction.deferUpdate();
  }

  private async handleConfirmButton(
    interaction: MessageComponentInteraction,
    selections: LockdownSelections,
    context: {
      collector: { stop: (reason?: string) => void };
      commandInteraction: Subcommand.ChatInputCommandInteraction;
    },
  ) {
    if (!interaction.isButton()) {
      return;
    }

    const { collector, commandInteraction } = context;

    await commandInteraction.editReply({
      components: [buildActivationComponent(selections.type, true)],
    });

    const success = await this.executeLockdown(interaction, selections);

    if (success) {
      collector.stop();

      return;
    }

    await commandInteraction.editReply({
      components: [buildActivationComponent(selections.type, false)],
    });
  }

  private async handleReasonButton(
    interaction: MessageComponentInteraction,
    selections: LockdownSelections,
  ) {
    if (!interaction.isButton()) {
      return;
    }

    const newReason = await this.promptReason(interaction, selections.reason);

    if (newReason === undefined) {
      Reflect.deleteProperty(selections, 'reason');
    } else {
      Reflect.set(selections, 'reason', newReason);
    }
  }

  private async handleRoleSelect(
    interaction: MessageComponentInteraction,
    selections: LockdownSelections,
  ) {
    if (!interaction.isRoleSelectMenu()) {
      return;
    }

    selections.excludedRoles = [...interaction.roles.keys()];

    await interaction.deferUpdate();
  }

  private async handleTypeSelect(
    interaction: MessageComponentInteraction,
    selections: LockdownSelections,
  ) {
    if (!interaction.isStringSelectMenu()) {
      return;
    }

    const selectedType = Object.values(LOCKDOWN_TYPE).find(
      (type) => type === interaction.values[0],
    );

    if (selectedType === undefined) {
      return;
    }

    selections.type = selectedType;

    await interaction.deferUpdate();
  }

  private async handleUnknownInteraction(
    interaction: MessageComponentInteraction,
  ) {
    logger.warn(
      `Received interaction with unknown customId: ${interaction.customId}`,
    );

    await interaction.deferUpdate().catch(() => null);
  }

  private async promptReason(
    interaction: MessageComponentInteraction,
    currentReason?: string,
  ): Promise<string | undefined> {
    await interaction.showModal(
      buildReasonModal(interaction.id, currentReason),
    );

    const modalSubmit = await interaction
      .awaitModalSubmit({
        filter: (mi) =>
          mi.customId ===
            `${LOCKDOWN_CUSTOM_ID.ReasonModal}:${interaction.id}` &&
          mi.user.id === interaction.user.id,
        time: IDLE_LIMIT,
      })
      .catch(() => null);

    if (modalSubmit === null) {
      return undefined;
    }

    const reason = modalSubmit.fields
      .getTextInputValue(LOCKDOWN_CUSTOM_ID.ReasonInput)
      .trim();

    await modalSubmit.deferUpdate();

    return reason === '' ? undefined : reason;
  }
}
