# Cortex Realm Discord Bot

A clean, lightweight, and feature-rich Discord moderation bot built for **Cortex Realm**. Powered by `discord.js` v14 with a local SQLite database — no external database servers required.

## Features

- **Prefix-based command system** — Default prefix is `!`, configurable per server (future)
- **Ignores reply messages** — Only responds to normal text messages, never to replies
- **Full moderation suite** — Kick, ban, timeout, mute, warn, purge, nuke, and more
- **Channel management** — Slowmode, lock/unlock, nickname changes
- **Role management** — Add, remove, or toggle roles with a single command
- **Information commands** — Server info, user info, avatar, icon, emoji list, member stats
- **Local database** — SQLite stores guild configs, user activity, and moderation logs
- **Command aliases** — Shortcuts like `!p` for ping, `!k` for kick, `!ui` for userinfo
- **Role hierarchy protection** — Cannot moderate users or manage roles above your own rank
- **Error fallback** — Every command is wrapped in error handling; failures send a temporary message and log to console
- **MIT Licensed** — Free to use, modify, and distribute
- **Zero comments** — Clean, self-documenting code

---

## Commands

All commands use the configured prefix (default `!`). Aliases are listed in parentheses.

### Moderation

| Command | Aliases | Permission | Description |
|---------|---------|------------|-------------|
| `!kick @user [reason]` | k | Kick Members | Kick a member from the server |
| `!ban @user [reason]` | b | Ban Members | Ban a member from the server |
| `!unban <id> [reason]` | ub | Ban Members | Unban a user by their ID |
| `!timeout @user <duration> [reason]` | to | Moderate Members | Timeout a member (e.g., `10m`, `2h`, `1d`) |
| `!mute @user <duration> [reason]` | m | Moderate Members | Alias for timeout |
| `!unmute @user [reason]` | um | Moderate Members | Remove a timeout early |
| `!warn @user [reason]` | w | Moderate Members | Issue a warning (logged to database) |
| `!warnings @user` | warns, ws | Moderate Members | View all warnings for a member |
| `!purge <1-100>` | clear, pr | Manage Messages | Bulk delete recent messages |
| `!nuke` | clone | Manage Channels | Clone and delete the channel for a clean reset |

### Channel Management

| Command | Aliases | Permission | Description |
|---------|---------|------------|-------------|
| `!slowmode <seconds\|off>` | sm | Manage Channels | Set channel slowmode (max 21600s / 6h) |
| `!lock` | lockdown | Manage Channels | Deny @everyone from sending messages |
| `!unlock` | unlockdown | Manage Channels | Restore @everyone's send permission |
| `!nick @user <name>` | nickname, setnick | Manage Nicknames | Change a member's nickname (max 32 chars) |

### Information

| Command | Aliases | Description |
|---------|---------|-------------|
| `!help` | h, commands | Show all available commands with aliases |
| `!ping` | p, latency | Check bot and API latency |
| `!botinfo` | stats, bot | Bot stats: servers, users, uptime, ping, version |
| `!serverinfo` | si, server, guild | Server info: owner, members, channels, boosts, roles |
| `!servericon` | icon, guildicon | Display the server icon at full resolution |
| `!userinfo [@user]` | ui, whois, user | User info: ID, roles, account age, join date |
| `!avatar [@user]` | pf, profilepic | Display a user's avatar at full resolution |
| `!membercount` | members, mc | Show total, user, bot, and online member counts |
| `!emojilist` | emojis, el | List all server emojis (static and animated) |

### Roles

| Command | Aliases | Permission | Description |
|---------|---------|------------|-------------|
| `!role <add\|remove\|toggle> @user <@role\|name\|id>` | roles | Manage Roles | Add, remove, or toggle a role on a member |

---

## Project Structure

```
cortex-realm-bot/
├── src/
│   ├── index.js              # Entry point — loads commands, events, and starts the bot
│   ├── database.js           # SQLite database — guilds, users, moderation logs
│   ├── utils.js              # Helpers — embed builder, error logging, support link
│   ├── commands/             # All bot commands
│   │   ├── avatar.js
│   │   ├── ban.js
│   │   ├── botinfo.js
│   │   ├── emojilist.js
│   │   ├── help.js
│   │   ├── kick.js
│   │   ├── lock.js
│   │   ├── membercount.js
│   │   ├── mute.js
│   │   ├── nick.js
│   │   ├── nuke.js
│   │   ├── ping.js
│   │   ├── purge.js
│   │   ├── role.js
│   │   ├── servericon.js
│   │   ├── serverinfo.js
│   │   ├── slowmode.js
│   │   ├── timeout.js
│   │   ├── unban.js
│   │   ├── unlock.js
│   │   ├── unmute.js
│   │   ├── userinfo.js
│   │   ├── warn.js
│   │   └── warnings.js
│   └── events/
│       ├── ready.js          # Bot ready event — logs in and sets presence
│       └── messageCreate.js  # Message handler — parses commands, ignores replies
├── .env.example              # Environment variable template
├── .gitignore
├── LICENSE                   # MIT License
├── package.json
└── README.md
```

---

## Database Schema

The bot uses a local SQLite database (`data.db`) with three tables:

### `guilds`
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Discord guild ID |
| prefix | TEXT DEFAULT '!' | Custom command prefix |
| created_at | DATETIME | When the guild was first seen |

### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Discord user ID |
| username | TEXT | Current username |
| messages_count | INTEGER DEFAULT 0 | Total messages counted |
| last_seen | DATETIME | Last message timestamp |

### `mod_logs`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-incrementing log ID |
| guild_id | TEXT NOT NULL | Guild where action occurred |
| user_id | TEXT NOT NULL | Target user |
| moderator_id | TEXT NOT NULL | Staff who performed the action |
| type | TEXT NOT NULL | Action type (Kick, Ban, Warn, Timeout, etc.) |
| reason | TEXT DEFAULT 'No reason provided' | Reason for the action |
| created_at | DATETIME | When the action occurred |

---

## Setup

### Prerequisites

- **Node.js** 18 or higher
- **Discord Bot Token** — [Create one in the Discord Developer Portal](https://discord.com/developers/applications)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd cortex-realm-bot

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

Edit `.env` and add your bot token:

```
DISCORD_TOKEN=your_bot_token_here
PREFIX=!
```

### Running

```bash
# Start the bot
npm start

# Or with auto-restart on file changes
npm run dev
```

---

## Bot Configuration

### Required Intents

Enable these in the Discord Developer Portal under **Bot > Privileged Gateway Intents**:

| Intent | Why it's needed |
|--------|----------------|
| **Guilds** | Server info, channels, roles |
| **Guild Messages** | Reading and responding to messages |
| **Message Content** | Parsing command arguments |
| **Guild Members** | Fetching member info, role hierarchy checks |
| **Guild Moderation** | Audit log events for moderation |
| **Guild Presences** | Online/offline status for membercount |

### Required Permissions

The bot needs these permissions to function fully:

- Send Messages
- Manage Messages (purge)
- Kick Members
- Ban Members
- Moderate Members (timeout/mute)
- Manage Channels (lock, slowmode, nuke)
- Manage Nicknames
- Manage Roles

---

## Error Handling

- Every command execution is wrapped in a `try/catch` block
- Errors are logged to the console with timestamps
- If a command fails, a temporary error message is sent to the channel and auto-deleted after 5 seconds
- The bot stays online and fully operational even if a single command errors

---

## Security

- **Role hierarchy protection** — Users cannot moderate or manage roles for members with equal or higher roles
- **Bot role protection** — Commands check if the bot has the required permissions before proceeding
- **Self-target prevention** — Users cannot kick, ban, timeout, or warn themselves
- **Permission checks** — Every command verifies the user has the appropriate Discord permission
- **Managed role protection** — Bot-managed roles (boosters, bot roles) cannot be modified via the role command

---

## License

MIT — see [LICENSE](./LICENSE).

Copyright (c) 2026 **Cortex Realm**

---

## Support

[Join the Cortex Realm Support Server](https://discord.gg/EWr3GgP6fe)

For issues, feature requests, or contributions, please open an issue or pull request on the repository.
