require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { init } = require('./database');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildPresences
  ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  try {
    const command = require(path.join(commandsPath, file));
    if (!command.data || !command.execute) {
      console.error(`[WARN] Command ${file} is missing a "data" or "execute" export.`);
      continue;
    }
    client.commands.set(command.data.name, command);
  } catch (error) {
    console.error(`[WARN] Failed to load command ${file}:`, error.message);
  }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

(async () => {
  try {
    await init();
    console.log('[DB] Database initialized');
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('[FATAL] Failed to start:', error.message);
    process.exit(1);
  }
})();
