
import fs from 'node:fs/promises';
import path from 'node:path';

import { AUDIT_LIMIT, DEFAULT_GUILD_SETTINGS } from '../constants.js';

function createBaseState() {
  return {
    guilds: {},
    challenges: {},
    audit: []
  };
}

function createGuildRecord() {
  return {
    settings: structuredClone(DEFAULT_GUILD_SETTINGS),
    stats: {
      started: 0,
      verified: 0,
      failed: 0,
      expired: 0,
      resets: 0,
      panelsSent: 0
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export class JsonDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.state = null;
    this.writeQueue = Promise.resolve();
  }

  async initialize() {
    if (this.state) {
      return;
    }

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      this.state = JSON.parse(raw);
    } catch {
      this.state = createBaseState();
      await this.#persist();
    }
  }

  async getGuild(guildId) {
    await this.initialize();
    return structuredClone(this.#ensureGuild(guildId));
  }

  async updateGuildSettings(guildId, patch) {
    return this.#mutate((state) => {
      const guild = this.#ensureGuild(guildId, state);
      guild.settings = {
        ...guild.settings,
        ...patch
      };
      guild.updatedAt = new Date().toISOString();
      return structuredClone(guild);
    });
  }

  async incrementPanelsSent(guildId) {
    return this.#mutate((state) => {
      const guild = this.#ensureGuild(guildId, state);
      guild.stats.panelsSent += 1;
      guild.updatedAt = new Date().toISOString();
      return structuredClone(guild.stats);
    });
  }

  async upsertChallenge(guildId, userId, challenge) {
    return this.#mutate((state) => {
      const guild = this.#ensureGuild(guildId, state);
      const key = this.#challengeKey(guildId, userId);

      state.challenges[key] = {
        guildId,
        userId,
        attemptCount: 0,
        createdAt: new Date().toISOString(),
        ...challenge
      };

      guild.stats.started += 1;
      guild.updatedAt = new Date().toISOString();

      return structuredClone(state.challenges[key]);
    });
  }

  async getChallenge(guildId, userId) {
    await this.initialize();
    const challenge = this.state.challenges[this.#challengeKey(guildId, userId)];
    return challenge ? structuredClone(challenge) : null;
  }

  async recordFailedAttempt(guildId, userId) {
    return this.#mutate((state) => {
      const guild = this.#ensureGuild(guildId, state);
      const key = this.#challengeKey(guildId, userId);
      const challenge = state.challenges[key];

      if (!challenge) {
        return null;
      }

      challenge.attemptCount += 1;
      const exhausted = challenge.attemptCount >= guild.settings.maxAttempts;

      if (exhausted) {
        delete state.challenges[key];
        guild.stats.failed += 1;
      }

      guild.updatedAt = new Date().toISOString();

      return {
        challenge: structuredClone(challenge),
        exhausted
      };
    });
  }

  async completeChallenge(guildId, userId) {
    return this.#mutate((state) => {
      const guild = this.#ensureGuild(guildId, state);
      const key = this.#challengeKey(guildId, userId);
      const challenge = state.challenges[key];

      if (!challenge) {
        return null;
      }

      delete state.challenges[key];
      guild.stats.verified += 1;
      guild.updatedAt = new Date().toISOString();

      return structuredClone(challenge);
    });
  }

  async expireChallenge(guildId, userId) {
    return this.#mutate((state) => {
      const guild = this.#ensureGuild(guildId, state);
      const key = this.#challengeKey(guildId, userId);
      const challenge = state.challenges[key];

      if (!challenge) {
        return null;
      }

      delete state.challenges[key];
      guild.stats.expired += 1;
      guild.updatedAt = new Date().toISOString();

      return structuredClone(challenge);
    });
  }

  async resetMember(guildId, userId) {
    return this.#mutate((state) => {
      const guild = this.#ensureGuild(guildId, state);
      const key = this.#challengeKey(guildId, userId);
      const challenge = state.challenges[key] ?? null;

      delete state.challenges[key];
      guild.stats.resets += 1;
      guild.updatedAt = new Date().toISOString();

      return challenge ? structuredClone(challenge) : null;
    });
  }

  async getGuildStats(guildId) {
    await this.initialize();
    const guild = this.#ensureGuild(guildId);
    const active = Object.values(this.state.challenges).filter((challenge) => challenge.guildId === guildId).length;

    return {
      ...structuredClone(guild.stats),
      active
    };
  }

  async addAuditEntry(entry) {
    return this.#mutate((state) => {
      state.audit.unshift({
        timestamp: new Date().toISOString(),
        ...entry
      });
      state.audit = state.audit.slice(0, AUDIT_LIMIT);
      return structuredClone(state.audit[0]);
    });
  }

  async expireStaleChallenges(now = Date.now()) {
    return this.#mutate((state) => {
      const expired = [];

      for (const [key, challenge] of Object.entries(state.challenges)) {
        if (new Date(challenge.expiresAt).getTime() > now) {
          continue;
        }

        const guild = this.#ensureGuild(challenge.guildId, state);
        guild.stats.expired += 1;
        guild.updatedAt = new Date().toISOString();
        expired.push(structuredClone(challenge));
        delete state.challenges[key];
      }

      return expired;
    });
  }

  async #mutate(mutator) {
    await this.initialize();

    this.writeQueue = this.writeQueue.then(async () => {
      const result = await mutator(this.state);
      await this.#persist();
      return result;
    });

    return this.writeQueue;
  }

  #ensureGuild(guildId, state = this.state) {
    if (!state.guilds[guildId]) {
      state.guilds[guildId] = createGuildRecord();
    }

    return state.guilds[guildId];
  }

  #challengeKey(guildId, userId) {
    return `${guildId}:${userId}`;
  }

  async #persist() {
    const tempPath = `${this.filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(this.state, null, 2), 'utf8');
    await fs.rename(tempPath, this.filePath);
  }
}
