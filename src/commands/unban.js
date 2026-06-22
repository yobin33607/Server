const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils');
const { modLogs } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server')
    .addStringOption(o => o.setName('user_id').setDescription('The ID of the user to unban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the unban'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ content: 'You need the **Ban Members** permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ content: 'I need the **Ban Members** permission to do that.', flags: MessageFlags.Ephemeral });
    }

    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      const banList = await interaction.guild.bans.fetch();
      const banned = banList.get(userId);

      if (!banned) {
        return interaction.reply({ content: 'That user is not banned from this server.', flags: MessageFlags.Ephemeral });
      }

      await interaction.guild.members.unban(userId, reason);

      modLogs.add(interaction.guildId, userId, interaction.user.id, 'Unban', reason);

      const embed = createEmbed({
        color: 0x57F287,
        description: `**${banned.user.tag}** has been unbanned.\nReason: ${reason}`
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      if (error.code === 10026 || error.code === 10013) {
        return interaction.reply({ content: 'That user is not banned from this server.', flags: MessageFlags.Ephemeral });
      }
      throw error;
    }
  }
};
