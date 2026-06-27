const test = require('node:test');
const assert = require('node:assert/strict');

const backupCommand = require('../src/commands/backup');
const loadBackupCommand = require('../src/commands/load-backup');
const { init, backups } = require('../src/database');

test('backup commands are registered with the expected slash command names', () => {
  assert.equal(backupCommand.data.name, 'backup');
  assert.equal(loadBackupCommand.data.name, 'load-backup');
});

test('backup snapshots can be persisted through the database layer', async () => {
  await init();
  const backupId = `DBTEST-${Date.now()}`;
  const backup = await backups.create({
    backupId,
    guildId: '123456789',
    name: 'Test Guild',
    channels: [],
    roles: [],
    emojis: [],
    stickers: []
  });

  assert.equal(backup.backupId, backupId);
  assert.equal(backup.guildId, '123456789');
  assert.equal(backup.name, 'Test Guild');
});
