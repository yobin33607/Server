const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils');
const { modLogs } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(o => o.setName('user').setDescription('The member to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the ban'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ content: 'You need the **Ban Members** permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ content: 'I need the **Ban Members** permission to do that.', flags: MessageFlags.Ephemeral });
    }

    const target = interaction.options.getMember('user');
    if (!target) {
      return interaction.reply({ content: 'That user is not a member of this server.', flags: MessageFlags.Ephemeral });
    }

    if (!target.bannable) {
      return interaction.reply({ content: 'I cannot ban that member. They may have higher permissions than me.', flags: MessageFlags.Ephemeral });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: 'You cannot ban yourself.', flags: MessageFlags.Ephemeral });
    }

    if (target.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: 'You cannot ban a member with equal or higher role than you.', flags: MessageFlags.Ephemeral });
    }

    const reason = interaction.options.getString('reason') || 'No reason provided';

    await target.send({
      embeds: [createEmbed({
        color: 0xED4245,
        description: `You have been banned from **${interaction.guild.name}**.\nReason: ${reason}`
      })]
    }).catch(() => {});

    await target.ban({ reason });

    modLogs.add(interaction.guildId, target.id, interaction.user.id, 'Ban', reason);

    const embed = createEmbed({
      color: 0xED4245,
      description: `**${target.user.tag}** has been banned.\nReason: ${reason}`
    });

    await interaction.reply({ embeds: [embed] });
  }
};
