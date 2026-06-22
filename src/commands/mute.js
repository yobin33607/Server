const { PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../utils');
const { modLogs } = require('../database');

module.exports = {
  name: 'mute',
  aliases: ['m'],
  description: 'Mute a member for a specified duration',
  usage: '<@user> <duration> [reason] | duration: 1m, 1h, 1d',

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

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply('You need the **Moderate Members** permission to use this command.');
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply('I need the **Moderate Members** permission to do that.');
    }

    const target = message.mentions.members.first();
    if (!target) {
      return message.reply('You need to mention a member to mute.\nUsage: `!mute @user 10m [reason]`');
    }

    if (!target.moderatable) {
      return message.reply('I cannot mute that member.');
    }

    if (target.id === message.author.id) {
      return message.reply('You cannot mute yourself.');
    }

    if (target.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
      return message.reply('You cannot mute a member with equal or higher role than you.');
    }

    const durationInput = args[1];
    if (!durationInput) {
      return message.reply('You need to specify a duration.\nUsage: `!mute @user 10m [reason]`');
    }

    const durationMs = this.parseDuration(durationInput);
    if (!durationMs) {
      return message.reply('Invalid duration format. Use `10m`, `2h`, or `1d`.');
    }

    if (durationMs > 2419200000) {
      return message.reply('Mute duration cannot exceed 28 days.');
    }

    const reason = args.slice(2).join(' ') || 'No reason provided';

    await target.timeout(durationMs, reason);

    modLogs.add(message.guildId, target.id, message.author.id, 'Mute', reason);

    const embed = createEmbed({
      color: 0xED4245,
      description: `**${target.user.tag}** has been muted for ${this.formatDuration(durationMs)}.\nReason: ${reason}`
    });

    await message.channel.send({ embeds: [embed] });
  }
};
