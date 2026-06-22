const { MessageFlags } = require('discord.js');
const { logError } = require('../utils');

module.exports = {
  name: 'interactionCreate',

  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      logError('interactionCreate', error);

      const payload = {
        content: 'An unexpected error occurred. Please try again later.',
        flags: MessageFlags.Ephemeral
      };

      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      } catch {
        // fail silently
      }
    }
  }
};
