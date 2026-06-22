const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a previously locked channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: 'You need the **Manage Channels** permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: 'I need the **Manage Channels** permission to do that.', flags: MessageFlags.Ephemeral });
    }

    const channel = interaction.channel;

    await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
      SendMessages: true
    });

    const embed = createEmbed({
      color: 0x57F287,
      description: `🔓 ${channel} has been unlocked.`
    });

    await interaction.reply({ embeds: [embed] });
  }
};
