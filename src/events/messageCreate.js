const { logError } = require('../utils');
const { users } = require('../database');

module.exports = {
  name: 'messageCreate',

  async execute(message) {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;

      users.upsert(message.author.id, message.author.username);
    } catch (error) {
      logError('messageCreate', error);
    }
  }
};
