require('dotenv').config();

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const { init, verification } = require('./database');
const { VerificationService } = require('./verification/verification-service');

const app = express();
const PORT = process.env.PORT || 3000;

const OAUTH_SCOPES = ['identify', 'guilds'];
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_CALLBACK_URL = process.env.DISCORD_CALLBACK_URL;
const SESSION_SECRET = process.env.SESSION_SECRET || 'bytelabs';

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

if (DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET && DISCORD_CALLBACK_URL) {
  passport.use(new DiscordStrategy({
    clientID: DISCORD_CLIENT_ID,
    clientSecret: DISCORD_CLIENT_SECRET,
    callbackURL: DISCORD_CALLBACK_URL,
    scope: OAUTH_SCOPES
  }, (accessToken, refreshToken, profile, done) => {
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;
    return done(null, profile);
  }));
}

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

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

app.get('/login', passport.authenticate('discord'));

app.get('/auth/discord/callback', passport.authenticate('discord', {
  failureRedirect: '/'
}), (req, res) => {
  res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
  req.logout?.(() => {
    res.redirect('/');
  });
});

app.get('/api/user', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.json({ authenticated: false, user: null });
  }

  const user = req.user;
  const guilds = Array.isArray(user.guilds) ? user.guilds.map(g => {
    const permissions = typeof g.permissions === 'string' ? parseInt(g.permissions, 10) : g.permissions;
    return {
      id: g.id,
      name: g.name,
      icon: g.icon,
      permissions,
      owner: g.owner,
      botPresent: !!client.guilds.cache.get(g.id)
    };
  }) : [];

  res.json({
    authenticated: true,
    user: {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      guilds
    }
  });
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'dashboard.html'));
});

app.get('/activity', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'activity.html'));
});

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
