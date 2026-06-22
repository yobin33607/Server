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

module.exports = { init, guilds, users, modLogs };
