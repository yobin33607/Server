module.exports = {
  name: 'ready',
  once: true,

  async execute(client) {
    console.log(`[READY] Logged in as ${client.user.tag}`);
    console.log(`[READY] Serving ${client.guilds.cache.size} guilds`);

    client.user.setActivity('Cortex Realm', { type: 3 });

    const commands = [...client.commands.values()].map(c => c.data.toJSON());
    const guildId = process.env.GUILD_ID;

    try {
      if (guildId) {
        await client.application.commands.set(commands, guildId);
        console.log(`[COMMANDS] Registered ${commands.length} guild commands to ${guildId}`);
      } else {
        await client.application.commands.set(commands);
        console.log(`[COMMANDS] Registered ${commands.length} global commands`);
      }
    } catch (error) {
      console.error('[COMMANDS] Failed to register slash commands:', error.message);
    }
  }
};
