import {
  ApplicationCommandOptionType,
  type CommandInteractionOption,
} from 'discord.js';
import { format } from 'winston';

export const formatOptions = (
  opts: readonly CommandInteractionOption[],
): string => {
  const first = opts[0];

  if (first === undefined) {
    return '';
  }

  if (
    first.type === ApplicationCommandOptionType.Subcommand ||
    first.type === ApplicationCommandOptionType.SubcommandGroup
  ) {
    const options = formatOptions(first.options ?? []);
    return ` ${first.name}${options}`;
  }

  const formatted = opts
    .map((opt) => {
      const value =
        opt.value ?? opt.channel?.name ?? opt.user?.tag ?? opt.role?.name;
      return `${opt.name}:${String(value)}`;
    })
    .join(', ');

  return ` [${formatted}]`;
};

export const formatLog = format.printf(
  ({ level, message, timestamp }) =>
    `${String(timestamp)} - ${level}: ${String(message)}`,
);
