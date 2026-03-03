import {
  type Guild,
  type NonThreadGuildBasedChannel,
  type OverwriteData,
  OverwriteType,
  type PermissionFlagsBits,
  PermissionsBitField,
} from 'discord.js';

import type { NewLockdownOverwrite } from '@/db/schema.js';
import type {
  AllowedLockdownChannelType,
  LockdownChannelPlan,
  LockdownType,
} from '@/types/lockdown.js';

import { LOCKDOWN_PERMISSIONS } from '@/constants/lockdown.js';

export const lockdownReason = ({
  reason,
  type,
  userId,
  username,
}: {
  reason?: string;
  type: 'activation' | 'deactivation';
  userId: string;
  username: string;
}) => {
  const reasonText =
    reason === undefined ? 'no reason provided' : `reason: ${reason}`;

  return `Lockdown ${type} by ${username} (${userId}) ${reasonText}`;
};

export const buildLockdownChannelPlan = ({
  channel,
  excludedRoles,
  guild,
  lockdownType,
}: {
  channel: NonThreadGuildBasedChannel & { type: AllowedLockdownChannelType };
  excludedRoles: Set<string>;
  guild: Guild;
  lockdownType: LockdownType;
}): LockdownChannelPlan => {
  const everyoneId = guild.roles.everyone.id;
  const permissions = Object.entries(
    LOCKDOWN_PERMISSIONS[lockdownType][channel.type],
  ) as Array<[keyof typeof PermissionFlagsBits, boolean | null]>;

  const toAllow = permissions.filter(([, v]) => v === true).map(([k]) => k);
  const toDeny = permissions.filter(([, v]) => v === false).map(([k]) => k);
  const toNeutral = permissions.filter(([, v]) => v === null).map(([k]) => k);

  const overwriteRows: NewLockdownOverwrite[] = [];
  const newOverwrites: OverwriteData[] = [];

  for (const overwrite of channel.permissionOverwrites.cache.values()) {
    if (excludedRoles.has(overwrite.id)) {
      newOverwrites.push({
        allow: overwrite.allow,
        deny: overwrite.deny,
        id: overwrite.id,
        type: overwrite.type,
      });

      continue;
    }

    overwriteRows.push({
      allow: overwrite.allow.bitfield.toString(),
      channelId: channel.id,
      deny: overwrite.deny.bitfield.toString(),
      guildId: guild.id,
      overwriteId: overwrite.id,
      overwriteType: overwrite.type,
    });

    const allow = new PermissionsBitField(overwrite.allow.bitfield);
    const deny = new PermissionsBitField(overwrite.deny.bitfield);

    if (overwrite.id === everyoneId) {
      allow.add(toAllow);
      allow.remove(toNeutral);
      deny.remove(toAllow);
      deny.add(toDeny);
    } else {
      allow.remove(permissions.map(([k]) => k));
    }

    newOverwrites.push({ allow, deny, id: overwrite.id, type: overwrite.type });
  }

  if (!channel.permissionOverwrites.cache.has(everyoneId)) {
    overwriteRows.push({
      allow: '0',
      channelId: channel.id,
      deny: '0',
      guildId: guild.id,
      overwriteId: everyoneId,
      overwriteType: OverwriteType.Role,
    });

    newOverwrites.push({
      allow: new PermissionsBitField().add(toAllow),
      deny: new PermissionsBitField().add(toDeny),
      id: everyoneId,
      type: OverwriteType.Role,
    });
  }

  return { channel, newOverwrites, overwriteRows };
};
