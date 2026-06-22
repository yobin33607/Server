const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils');
const { modLogs } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member for a specified duration')
    .addUserOption(o => o.setName('user').setDescription('The member to timeout').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('Duration, e.g. 10m, 2h, 1d').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the timeout'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  parseDuration(input) {
    const match = input.match(/^(\d+)([mhd])$/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers = { m: 60000, h: 3600000, d: 86400000 };

    return value * multipliers[unit];
  },

  formatDuration(ms) {
    const totalMinutes = Math.floor(ms / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);

    return parts.join(' ') || '0m';
  },

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
      return interaction.reply({ content: 'I cannot timeout that member.', flags: MessageFlags.Ephemeral });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: 'You cannot timeout yourself.', flags: MessageFlags.Ephemeral });
    }

    if (target.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: 'You cannot timeout a member with equal or higher role than you.', flags: MessageFlags.Ephemeral });
    }

    const durationMs = this.parseDuration(interaction.options.getString('duration'));
    if (!durationMs) {
      return interaction.reply({ content: 'Invalid duration format. Use `10m`, `2h`, or `1d`.', flags: MessageFlags.Ephemeral });
    }

    if (durationMs > 2419200000) {
      return interaction.reply({ content: 'Timeout duration cannot exceed 28 days.', flags: MessageFlags.Ephemeral });
    }

    const reason = interaction.options.getString('reason') || 'No reason provided';

    await target.timeout(durationMs, reason);

    modLogs.add(interaction.guildId, target.id, interaction.user.id, 'Timeout', reason);

    const embed = createEmbed({
      color: 0xED4245,
      description: `**${target.user.tag}** has been timed out for ${this.formatDuration(durationMs)}.\nReason: ${reason}`
    });

    await interaction.reply({ embeds: [embed] });
  }
};
