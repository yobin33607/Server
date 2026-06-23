require('dotenv').config();

const express = require('express');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const { init, verification } = require('./database');
const { VerificationService } = require('./verification/verification-service');

const app = express();
const PORT = process.env.PORT || 3000;

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
client.verification = new VerificationService(verification);

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
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

app.use(express.static(path.join(__dirname, 'web')));
app.use(express.json());

app.get('/api/stats', (req, res) => {
  res.json({
    servers: client.guilds.cache.size,
    users: client.users.cache.size,
    ping: client.ws.ping
  });
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'privacy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'terms.html'));
});

(async () => {
  try {
    await init();
    await client.login(process.env.DISCORD_TOKEN);
    app.listen(PORT, () => console.log(`Dashboard running on ${PORT}`));
  } catch (error) {
    console.error(error);
  }
})();
