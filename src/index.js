import { ActivityType, Client, GatewayIntentBits, REST, Routes } from 'discord.js';

import { config } from './config.js';
import { createInteractionHandler, loadCommands } from './handlers/interaction-create.js';
import { JsonDatabase } from './services/database.js';
import { VerificationService } from './services/verification-service.js';

if (!config.token) {
  throw new Error('DISCORD_TOKEN is required.');
}

const database = new JsonDatabase(config.databasePath);
await database.initialize();

const verification = new VerificationService(database);
const commands = await loadCommands();
const commandBody = [...commands.values()].map((command) => command.data.toJSON());

if (!config.clientId) {
  throw new Error('DISCORD_CLIENT_ID is required.');
}

async function deployCommands() {
  const rest = new REST({ version: '10' }).setToken(config.token);
  await rest.put(Routes.applicationCommands(config.clientId), {
    body: commandBody
  });
  console.log('Deployed global commands.');
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.once('ready', async (readyClient) => {
  await deployCommands();
  readyClient.user.setActivity('Server Security | Byte Labs', {
    type: ActivityType.Watching
  });
  console.log(`Logged in as ${readyClient.user.tag}`);
  setInterval(() => {
    verification.cleanupExpiredChallenges(readyClient).catch(console.error);
  }, 60_000);
});

client.on(
  'interactionCreate',
  createInteractionHandler({
    commands,
    services: {
      database,
      verification
    }
  })
);

await client.login(config.token);
