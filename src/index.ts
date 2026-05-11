import {
  ApplicationCommandRegistries,
  LogLevel,
  RegisterBehavior,
  SapphireClient,
} from '@sapphire/framework';
import { Events, GatewayIntentBits, Partials } from 'discord.js';

import { logger } from './logger/index.js';
import { startReminderScheduler } from './services/reminderScheduler.js';

try {
  process.loadEnvFile();
} catch {
  // .env file is optional
}

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

await client.login(process.env['TOKEN']);
