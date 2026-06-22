const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils');
const { modLogs } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove a timeout from a member')
    .addUserOption(o => o.setName('user').setDescription('The member to unmute').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the unmute'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: 'You need the **Moderate Members** permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: 'I need the **Moderate Members** permission to do that.', flags: MessageFlags.Ephemeral });
    }

    const target = interaction.options.getMember('user');
    if (!target) {
      return interaction.reply({ content: 'That user is not a member of this server.', flags: MessageFlags.Ephemeral });
    }

    if (!target.moderatable) {
      return interaction.reply({ content: 'I cannot unmute that member.', flags: MessageFlags.Ephemeral });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: 'You cannot unmute yourself.', flags: MessageFlags.Ephemeral });
    }

    if (target.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: 'You cannot unmute a member with equal or higher role than you.', flags: MessageFlags.Ephemeral });
    }

    if (!target.communicationDisabledUntil) {
      return interaction.reply({ content: 'That member is not currently muted.', flags: MessageFlags.Ephemeral });
    }

    const reason = interaction.options.getString('reason') || 'No reason provided';

    await target.timeout(null, reason);

    modLogs.add(interaction.guildId, target.id, interaction.user.id, 'Unmute', reason);

    const embed = createEmbed({
      color: 0x57F287,
      description: `**${target.user.tag}** has been unmuted.\nReason: ${reason}`
    });

    await interaction.reply({ embeds: [embed] });
  }
};
