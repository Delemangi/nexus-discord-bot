import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

import type { Reminder } from '../db/schema.js';

export const buildDeleteButtons = (reminderList: Reminder[]) => {
  const rows: Array<ActionRowBuilder<ButtonBuilder>> = [];
  let currentRow = new ActionRowBuilder<ButtonBuilder>();

  for (const [index, reminder] of reminderList.entries()) {
    if (currentRow.components.length === 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder<ButtonBuilder>();
    }

    const label =
      reminder.message.length > 50
        ? `${reminder.message.slice(0, 47)}...`
        : reminder.message;

    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`delete_reminder_${reminder.id}`)
        .setLabel(`${index + 1}. ${label}`)
        .setStyle(ButtonStyle.Danger),
    );
  }

  if (currentRow.components.length > 0) {
    rows.push(currentRow);
  }

  return rows;
};
