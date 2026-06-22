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
      description: `## Byte Labs Server Bot\n\n${commands.join('\n')}\n\n[Join Support Server](https://discord.gg/wZuTsF5Z2P)`
    });

    await interaction.reply({ embeds: [embed] });
  }
};
