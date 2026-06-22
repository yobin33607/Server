# Contributing to Byte Labs Server Bot

Thanks for taking the time to contribute! This document explains how to get set up and the conventions this project follows.

## Getting started

1. **Fork** the repository and **clone** your fork.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment template and add your own bot token:
   ```bash
   cp .env.example .env
   ```
   Never commit your `.env` file — it contains your bot token.
4. Run the bot:
   ```bash
   npm run dev
   ```

## Project conventions

- **Slash commands only.** Every command lives in its own file under `src/commands/` and exports:
  - `data` — a `SlashCommandBuilder` describing the command, its options, and its default permissions.
  - `execute(interaction)` — an async handler.
- **No comments.** The codebase is intentionally comment-free and self-documenting. Match the surrounding style.
- **Permission checks.** Moderation commands must check both the invoking member's permissions and the bot's own permissions, and respect role hierarchy.
- **Ephemeral errors.** Validation and error responses to the user should be ephemeral (`flags: MessageFlags.Ephemeral`).
- **Embeds.** Use the `createEmbed` helper from `src/utils.js` for user-facing output.

## Adding a new command

1. Create `src/commands/<name>.js` following an existing command as a template.
2. Give it a unique lowercase `setName(...)` and a `setDescription(...)`.
3. The command is auto-loaded on startup and registered with Discord by the `ready` event — no manual wiring needed.
4. Update the command table in `README.md`.

## Testing your change

There is no automated test suite. Before opening a PR:

- Run `node --check` on any file you changed (or just `npm start`) to confirm it parses.
- Boot the bot against a test server (set `GUILD_ID` in `.env` for instant command registration) and confirm the command works end-to-end.

## Submitting a pull request

1. Create a branch off `main`.
2. Keep changes focused — one feature or fix per PR.
3. Fill out the pull request template.
4. Make sure no secrets (`.env`, `data.db`) are included in your commit.

## Reporting bugs and requesting features

Open an issue on the repository, or reach us in the [Byte Labs Server](https://discord.gg/wZuTsF5Z2P).

## Security

Please do **not** open public issues for security vulnerabilities. See [SECURITY.md](./SECURITY.md) for how to report them responsibly.
