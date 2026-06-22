const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),

  async execute(interaction) {
    const commands = [...interaction.client.commands.values()]
      .map(cmd => `**/${cmd.data.name}** — ${cmd.data.description}`)
      .sort();

    const embed = createEmbed({
      description: `## Cortex Realm Bot\n\n${commands.join('\n')}\n\n[Join Support Server](https://discord.gg/EWr3GgP6fe)`
    });

    await interaction.reply({ embeds: [embed] });
  }
};
