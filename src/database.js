const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data.db');

let db;

async function init() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');

  db.run(`
    CREATE TABLE IF NOT EXISTS guilds (
      id TEXT PRIMARY KEY,
      prefix TEXT DEFAULT '!',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      messages_count INTEGER DEFAULT 0,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS mod_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      type TEXT NOT NULL,
      reason TEXT DEFAULT 'No reason provided',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS verify_guilds (
      guild_id TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 1,
      verified_role_id TEXT,
      panel_channel_id TEXT,
      log_channel_id TEXT,
      captcha_length INTEGER DEFAULT 6,
      timeout_minutes INTEGER DEFAULT 5,
      max_attempts INTEGER DEFAULT 3,
      started INTEGER DEFAULT 0,
      verified INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      expired INTEGER DEFAULT 0,
      resets INTEGER DEFAULT 0,
      panels_sent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS verify_challenges (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      answer TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempt_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (guild_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS verify_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      action TEXT,
      actor_id TEXT,
      target_id TEXT,
      metadata TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reaction_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      role_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  save();
  return db;
}

function save() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

const guilds = {
  get(guildId) {
    const stmt = db.prepare('SELECT * FROM guilds WHERE id = ?');
    stmt.bind([guildId]);
    let result;
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    return result;
  },

  set(guildId, data) {
    const existing = db.prepare('SELECT id FROM guilds WHERE id = ?');
    existing.bind([guildId]);
    const exists = existing.step();
    existing.free();

    if (exists) {
      db.run('UPDATE guilds SET prefix = ? WHERE id = ?', [data.prefix || '!', guildId]);
    } else {
      db.run('INSERT INTO guilds (id, prefix) VALUES (?, ?)', [guildId, data.prefix || '!']);
    }

    save();
  }
};

const users = {
  get(userId) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    stmt.bind([userId]);
    let result;
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    return result;
  },

  upsert(userId, username) {
    const existing = db.prepare('SELECT id FROM users WHERE id = ?');
    existing.bind([userId]);
    const exists = existing.step();
    existing.free();

    if (exists) {
      db.run(
        'UPDATE users SET username = ?, messages_count = messages_count + 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
        [username, userId]
      );
    } else {
      db.run(
        'INSERT INTO users (id, username, messages_count, last_seen) VALUES (?, ?, 1, CURRENT_TIMESTAMP)',
        [userId, username]
      );
    }

    save();
  }
};

const modLogs = {
  add(guildId, userId, moderatorId, type, reason) {
    db.run(
      'INSERT INTO mod_logs (guild_id, user_id, moderator_id, type, reason) VALUES (?, ?, ?, ?, ?)',
      [guildId, userId, moderatorId, type, reason || 'No reason provided']
    );
    save();
  },

  getByUser(guildId, userId) {
    const stmt = db.prepare(
      'SELECT * FROM mod_logs WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC'
    );
    stmt.bind([guildId, userId]);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  },

  getAll(guildId) {
    const stmt = db.prepare(
      'SELECT * FROM mod_logs WHERE guild_id = ? ORDER BY created_at DESC LIMIT 100'
    );
    stmt.bind([guildId]);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }
};

const AUDIT_LIMIT = 200;

const VERIFY_SETTING_COLUMNS = {
  enabled: 'enabled',
  verifiedRoleId: 'verified_role_id',
  panelChannelId: 'panel_channel_id',
  logChannelId: 'log_channel_id',
  captchaLength: 'captcha_length',
  timeoutMinutes: 'timeout_minutes',
  maxAttempts: 'max_attempts'
};

function mapVerifyGuild(row) {
  return {
    settings: {
      enabled: !!row.enabled,
      verifiedRoleId: row.verified_role_id ?? null,
      panelChannelId: row.panel_channel_id ?? null,
      logChannelId: row.log_channel_id ?? null,
      captchaLength: row.captcha_length,
      timeoutMinutes: row.timeout_minutes,
      maxAttempts: row.max_attempts
    },
    stats: {
      started: row.started,
      verified: row.verified,
      failed: row.failed,
      expired: row.expired,
      resets: row.resets,
      panelsSent: row.panels_sent
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapChallenge(row) {
  if (!row) {
    return null;
  }
  return {
    guildId: row.guild_id,
    userId: row.user_id,
    answer: row.answer,
    expiresAt: row.expires_at,
    attemptCount: row.attempt_count,
    createdAt: row.created_at
  };
}

function getVerifyGuildRow(guildId) {
  const stmt = db.prepare('SELECT * FROM verify_guilds WHERE guild_id = ?');
  stmt.bind([guildId]);
  let row;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

function ensureVerifyGuild(guildId) {
  let row = getVerifyGuildRow(guildId);
  if (!row) {
    db.run('INSERT INTO verify_guilds (guild_id) VALUES (?)', [guildId]);
    save();
    row = getVerifyGuildRow(guildId);
  }
  return row;
}

function getChallengeRow(guildId, userId) {
  const stmt = db.prepare('SELECT * FROM verify_challenges WHERE guild_id = ? AND user_id = ?');
  stmt.bind([guildId, userId]);
  let row;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

const verification = {
  getGuild(guildId) {
    return mapVerifyGuild(ensureVerifyGuild(guildId));
  },

  updateGuildSettings(guildId, patch) {
    ensureVerifyGuild(guildId);

    const assignments = [];
    const values = [];

    for (const [key, column] of Object.entries(VERIFY_SETTING_COLUMNS)) {
      if (patch[key] === undefined) {
        continue;
      }
      let value = patch[key];
      if (key === 'enabled') {
        value = value ? 1 : 0;
      }
      assignments.push(`${column} = ?`);
      values.push(value);
    }

    assignments.push('updated_at = CURRENT_TIMESTAMP');
    values.push(guildId);

    db.run(`UPDATE verify_guilds SET ${assignments.join(', ')} WHERE guild_id = ?`, values);
    save();

    return verification.getGuild(guildId);
  },

  incrementPanelsSent(guildId) {
    ensureVerifyGuild(guildId);
    db.run(
      'UPDATE verify_guilds SET panels_sent = panels_sent + 1, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?',
      [guildId]
    );
    save();
    return verification.getGuild(guildId).stats;
  },

  upsertChallenge(guildId, userId, challenge) {
    ensureVerifyGuild(guildId);
    db.run(
      'INSERT OR REPLACE INTO verify_challenges (guild_id, user_id, answer, expires_at, attempt_count, created_at) VALUES (?, ?, ?, ?, 0, ?)',
      [guildId, userId, challenge.answer, challenge.expiresAt, new Date().toISOString()]
    );
    db.run(
      'UPDATE verify_guilds SET started = started + 1, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?',
      [guildId]
    );
    save();
    return mapChallenge(getChallengeRow(guildId, userId));
  },

  getChallenge(guildId, userId) {
    return mapChallenge(getChallengeRow(guildId, userId));
  },

  recordFailedAttempt(guildId, userId) {
    const guild = ensureVerifyGuild(guildId);
    const row = getChallengeRow(guildId, userId);

    if (!row) {
      return null;
    }

    const attemptCount = row.attempt_count + 1;
    const exhausted = attemptCount >= guild.max_attempts;

    if (exhausted) {
      db.run('DELETE FROM verify_challenges WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
      db.run(
        'UPDATE verify_guilds SET failed = failed + 1, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?',
        [guildId]
      );
    } else {
      db.run(
        'UPDATE verify_challenges SET attempt_count = ? WHERE guild_id = ? AND user_id = ?',
        [attemptCount, guildId, userId]
      );
      db.run('UPDATE verify_guilds SET updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?', [guildId]);
    }

    save();

    return {
      challenge: { ...mapChallenge(row), attemptCount },
      exhausted
    };
  },

  completeChallenge(guildId, userId) {
    ensureVerifyGuild(guildId);
    const row = getChallengeRow(guildId, userId);
    if (!row) {
      return null;
    }

    db.run('DELETE FROM verify_challenges WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
    db.run(
      'UPDATE verify_guilds SET verified = verified + 1, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?',
      [guildId]
    );
    save();

    return mapChallenge(row);
  },

  expireChallenge(guildId, userId) {
    ensureVerifyGuild(guildId);
    const row = getChallengeRow(guildId, userId);
    if (!row) {
      return null;
    }

    db.run('DELETE FROM verify_challenges WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
    db.run(
      'UPDATE verify_guilds SET expired = expired + 1, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?',
      [guildId]
    );
    save();

    return mapChallenge(row);
  },

  resetMember(guildId, userId) {
    ensureVerifyGuild(guildId);
    const row = getChallengeRow(guildId, userId);

    db.run('DELETE FROM verify_challenges WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
    db.run(
      'UPDATE verify_guilds SET resets = resets + 1, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?',
      [guildId]
    );
    save();

    return mapChallenge(row);
  },

  getGuildStats(guildId) {
    const guild = verification.getGuild(guildId);

    const stmt = db.prepare('SELECT COUNT(*) AS active FROM verify_challenges WHERE guild_id = ?');
    stmt.bind([guildId]);
    let active = 0;
    if (stmt.step()) {
      active = stmt.getAsObject().active;
    }
    stmt.free();

    return { ...guild.stats, active };
  },

  addAuditEntry(entry) {
    db.run(
      'INSERT INTO verify_audit (guild_id, action, actor_id, target_id, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [
        entry.guildId ?? null,
        entry.action ?? null,
        entry.actorId ?? null,
        entry.targetId ?? null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        new Date().toISOString()
      ]
    );

    db.run(
      'DELETE FROM verify_audit WHERE id NOT IN (SELECT id FROM verify_audit ORDER BY id DESC LIMIT ?)',
      [AUDIT_LIMIT]
    );
    save();
  },

  expireStaleChallenges(now = Date.now()) {
    const stmt = db.prepare('SELECT * FROM verify_challenges');
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    const expired = [];
    for (const row of rows) {
      if (new Date(row.expires_at).getTime() > now) {
        continue;
      }

      ensureVerifyGuild(row.guild_id);
      db.run('DELETE FROM verify_challenges WHERE guild_id = ? AND user_id = ?', [row.guild_id, row.user_id]);
      db.run(
        'UPDATE verify_guilds SET expired = expired + 1, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?',
        [row.guild_id]
      );
      expired.push(mapChallenge(row));
    }

    if (expired.length > 0) {
      save();
    }

    return expired;
  }
};

const reactionRoles = {
  addRule(guildId, channelId, messageId, emoji, roleId) {
    db.run(
      'INSERT INTO reaction_roles (guild_id, channel_id, message_id, emoji, role_id) VALUES (?, ?, ?, ?, ?)',
      [guildId, channelId, messageId, emoji, roleId]
    );

    const stmt = db.prepare('SELECT * FROM reaction_roles WHERE id = last_insert_rowid()');
    let row;
    if (stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.free();
    save();
    return row;
  },

  removeRule(guildId, channelId, messageId, emoji) {
    const stmt = db.prepare(
      'SELECT * FROM reaction_roles WHERE guild_id = ? AND channel_id = ? AND message_id = ? AND emoji = ?'
    );
    stmt.bind([guildId, channelId, messageId, emoji]);
    let row;
    if (stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.free();

    if (!row) {
      return null;
    }

    db.run('DELETE FROM reaction_roles WHERE id = ?', [row.id]);
    save();
    return row;
  },

  getRuleById(id) {
    const stmt = db.prepare('SELECT * FROM reaction_roles WHERE id = ?');
    stmt.bind([id]);
    let row;
    if (stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.free();
    return row;
  },

  getRule(guildId, channelId, messageId, emoji) {
    const stmt = db.prepare(
      'SELECT * FROM reaction_roles WHERE guild_id = ? AND channel_id = ? AND message_id = ? AND emoji = ?'
    );
    stmt.bind([guildId, channelId, messageId, emoji]);
    let row;
    if (stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.free();
    return row;
  },

  getRulesByMessage(guildId, messageId) {
    const stmt = db.prepare('SELECT * FROM reaction_roles WHERE guild_id = ? AND message_id = ? ORDER BY created_at ASC');
    stmt.bind([guildId, messageId]);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  },

  getRulesByGuild(guildId, channelId = null) {
    let query = 'SELECT * FROM reaction_roles WHERE guild_id = ?';
    const params = [guildId];
    if (channelId) {
      query += ' AND channel_id = ?';
      params.push(channelId);
    }
    query += ' ORDER BY created_at ASC';

    const stmt = db.prepare(query);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }
};

module.exports = { init, guilds, users, modLogs, verification, reactionRoles };
