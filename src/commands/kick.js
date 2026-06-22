const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils');
const { modLogs } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(o => o.setName('user').setDescription('The member to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the kick'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({ content: 'You need the **Kick Members** permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({ content: 'I need the **Kick Members** permission to do that.', flags: MessageFlags.Ephemeral });
    }

    const target = interaction.options.getMember('user');
    if (!target) {
      return interaction.reply({ content: 'That user is not a member of this server.', flags: MessageFlags.Ephemeral });
    }

    if (!target.kickable) {
      return interaction.reply({ content: 'I cannot kick that member. They may have higher permissions than me.', flags: MessageFlags.Ephemeral });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: 'You cannot kick yourself.', flags: MessageFlags.Ephemeral });
    }

    if (target.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: 'You cannot kick a member with equal or higher role than you.', flags: MessageFlags.Ephemeral });
    }

    const reason = interaction.options.getString('reason') || 'No reason provided';

    await target.send({
      embeds: [createEmbed({
        color: 0xED4245,
        description: `You have been kicked from **${interaction.guild.name}**.\nReason: ${reason}`
      })]
    }).catch(() => {});

    await target.kick(reason);

    modLogs.add(interaction.guildId, target.id, interaction.user.id, 'Kick', reason);

    const embed = createEmbed({
      color: 0xED4245,
      description: `**${target.user.tag}** has been kicked.\nReason: ${reason}`
    });

    await interaction.reply({ embeds: [embed] });
  }
};
