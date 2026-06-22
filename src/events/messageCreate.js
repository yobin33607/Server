const { logError } = require('../utils');
const { guilds, users } = require('../database');

module.exports = {
  name: 'messageCreate',

  async execute(message) {
    try {
      if (message.author.bot) return;
      if (message.reference) return;

      const prefix = guilds.get(message.guildId)?.prefix || process.env.PREFIX || '!';

      users.upsert(message.author.id, message.author.username);

      if (!message.content.startsWith(prefix)) return;

      const args = message.content.slice(prefix.length).trim().split(/\s+/);
      const commandName = args.shift()?.toLowerCase();
      if (!commandName) return;

      const command = message.client.commands.get(commandName);
      if (!command) return;

      await command.execute(message, args);
    } catch (error) {
      logError('messageCreate', error);

      try {
        const reply = await message.channel.send(
          'An unexpected error occurred. Please try again later.'
        );
        setTimeout(() => reply.delete().catch(() => {}), 5000);
      } catch {
        // fail silently
      }
    }
  }
};
