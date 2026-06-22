# Security Policy

## Supported Versions

The latest release on the `main` branch is the only actively supported version.

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, report them privately through one of the following channels:

- Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) ("Report a vulnerability" under the repository's **Security** tab).
- Or contact the maintainers directly in the [Byte Labs Server](https://discord.gg/wZuTsF5Z2P).

Please include:

- A description of the vulnerability and its impact.
- Steps to reproduce or a proof of concept.
- Any suggested remediation, if you have one.

You can expect an initial response within **72 hours**, and we will keep you informed as we work on a fix.

## Handling Secrets

This bot relies on a Discord bot token stored in a local `.env` file. To keep deployments secure:

- **Never commit `.env`** — it is already listed in `.gitignore`.
- **Never share or paste your bot token.** If a token is ever exposed, immediately **reset it** in the [Discord Developer Portal](https://discord.com/developers/applications) under your application's **Bot** settings.
- The local `data.db` SQLite file may contain moderation logs and user data; it is also git-ignored and should not be committed or shared.
- Grant the bot only the [Discord permissions](./README.md#required-permissions) it needs to operate.

## Scope

This policy covers the bot's source code in this repository. Vulnerabilities in third-party dependencies should be reported upstream, though we welcome a heads-up so we can bump the dependency (Dependabot also monitors these automatically).
