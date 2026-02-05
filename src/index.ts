import {
  ApplicationCommandRegistries,
  LogLevel,
  RegisterBehavior,
  SapphireClient,
} from '@sapphire/framework';
import { Events, GatewayIntentBits, Partials } from 'discord.js';
import { config } from 'dotenv';

import { logger } from './logger/index.js';
import { startReminderScheduler } from './services/reminderScheduler.js';

config({ quiet: true });

ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(
  RegisterBehavior.BulkOverwrite,
);

const client = new SapphireClient({
  baseUserDirectory: import.meta.dirname,
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  logger: {
    level: LogLevel.Info,
  },
  partials: [Partials.Message, Partials.Reaction],
});

client.once(Events.ClientReady, () => {
  logger.info(`✅ Bot logged in as ${client.user?.tag}`);
  startReminderScheduler(client);
});

void client.login(process.env['TOKEN']);
