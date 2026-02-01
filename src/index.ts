import { LogLevel, SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';

import { logger } from './logger/index.js';

config();

const client = new SapphireClient({
  intents: [GatewayIntentBits.Guilds],
  logger: {
    level: LogLevel.Info,
  },
});

client.once('ready', () => {
  logger.info(`✅ Bot logged in as ${client.user?.tag}`);
});

void client.login(process.env['TOKEN']);
