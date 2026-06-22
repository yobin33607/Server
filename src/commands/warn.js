const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils');
const { modLogs } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(o => o.setName('user').setDescription('The member to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the warning'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: 'You need the **Moderate Members** permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    const target = interaction.options.getMember('user');
    if (!target) {
      return interaction.reply({ content: 'That user is not a member of this server.', flags: MessageFlags.Ephemeral });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: 'You cannot warn yourself.', flags: MessageFlags.Ephemeral });
    }

    if (target.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: 'You cannot warn a member with equal or higher role than you.', flags: MessageFlags.Ephemeral });
    }

    const reason = interaction.options.getString('reason') || 'No reason provided';

    modLogs.add(interaction.guildId, target.id, interaction.user.id, 'Warn', reason);

    await target.send({
      embeds: [createEmbed({
        color: 0xFEE75C,
        description: `You have been warned in **${interaction.guild.name}**.\nReason: ${reason}`
      })]
    }).catch(() => {});

    const embed = createEmbed({
      color: 0xFEE75C,
      description: `**${target.user.tag}** has been warned.\nReason: ${reason}`
    });

    await interaction.reply({ embeds: [embed] });
  }
};
