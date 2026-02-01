import { LogLevel, SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';

config();

const client = new SapphireClient({
  intents: [GatewayIntentBits.Guilds],
  logger: {
    level: LogLevel.Info,
  },
});

void client.login(process.env['TOKEN']);
