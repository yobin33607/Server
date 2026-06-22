module.exports = {
  name: 'ready',
  once: true,

  execute(client) {
    console.log(`[READY] Logged in as ${client.user.tag}`);
    console.log(`[READY] Serving ${client.guilds.cache.size} guilds`);

    client.user.setActivity('Cortex Realm', { type: 3 });
  }
};
