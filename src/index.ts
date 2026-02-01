import {
  ApplicationCommandRegistries,
  LogLevel,
  RegisterBehavior,
  SapphireClient,
} from '@sapphire/framework';
import { Events, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';

import { logger } from './logger/index.js';
import { startReminderScheduler } from './services/reminderScheduler.js';

config();

ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(
  RegisterBehavior.BulkOverwrite,
);

const client = new SapphireClient({
  baseUserDirectory: import.meta.dirname,
  intents: [GatewayIntentBits.Guilds],
  logger: {
    level: LogLevel.Info,
  },
});

client.once(Events.ClientReady, () => {
  logger.info(`✅ Bot logged in as ${client.user?.tag}`);
  startReminderScheduler(client);
});

void client.login(process.env['TOKEN']);
