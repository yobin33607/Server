const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription("Show a user's avatar")
    .addUserOption(o => o.setName('user').setDescription('The user to show (defaults to you)')),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;

    const avatarURL = target.displayAvatarURL({ size: 1024 });
    const embed = createEmbed({
      description: `${target.tag}'s avatar`
    }).setImage(avatarURL);

    await interaction.reply({ embeds: [embed] });
  }
};
