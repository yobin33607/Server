const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode for the current channel')
    .addStringOption(o => o.setName('duration').setDescription('Seconds (0-21600) or "off"').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: 'You need the **Manage Channels** permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: 'I need the **Manage Channels** permission to do that.', flags: MessageFlags.Ephemeral });
    }

    const input = interaction.options.getString('duration').toLowerCase();

    let seconds;

    if (input === 'off' || input === '0' || input === 'disable') {
      seconds = 0;
    } else {
      seconds = parseInt(input);

      if (isNaN(seconds) || seconds < 0) {
        return interaction.reply({ content: 'Invalid value. Use a number between 0 and 21600, or `off`.', flags: MessageFlags.Ephemeral });
      }

      if (seconds > 21600) {
        return interaction.reply({ content: 'Slowmode cannot exceed 21600 seconds (6 hours).', flags: MessageFlags.Ephemeral });
      }
    }

    await interaction.channel.setRateLimitPerUser(seconds);

    const display = seconds === 0 ? 'disabled' : `${seconds} second${seconds !== 1 ? 's' : ''}`;

    const embed = createEmbed({
      color: 0x57F287,
      description: `Slowmode has been set to **${display}** for ${interaction.channel}.`
    });

    await interaction.reply({ embeds: [embed] });
  }
};
