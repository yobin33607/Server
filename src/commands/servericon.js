const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('servericon')
    .setDescription('Show the server icon'),

  async execute(interaction) {
    const guild = interaction.guild;
    const iconURL = guild.iconURL({ size: 1024 });

    if (!iconURL) {
      return interaction.reply({ content: 'This server does not have an icon.', flags: MessageFlags.Ephemeral });
    }

    const embed = createEmbed({
      description: `${guild.name}'s server icon`
    }).setImage(iconURL);

    await interaction.reply({ embeds: [embed] });
  }
};
