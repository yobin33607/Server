const { PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../utils');
const { modLogs } = require('../database');

module.exports = {
  name: 'unmute',
  aliases: ['um'],
  description: 'Remove a timeout from a member',
  usage: '<@user> [reason]',

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply('You need the **Moderate Members** permission to use this command.');
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply('I need the **Moderate Members** permission to do that.');
    }

    const target = message.mentions.members.first();
    if (!target) {
      return message.reply('You need to mention a member to unmute.\nUsage: `!unmute @user [reason]`');
    }

    if (!target.moderatable) {
      return message.reply('I cannot unmute that member.');
    }

    if (target.id === message.author.id) {
      return message.reply('You cannot unmute yourself.');
    }

    if (target.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
      return message.reply('You cannot unmute a member with equal or higher role than you.');
    }

    if (!target.communicationDisabledUntil) {
      return message.reply('That member is not currently muted.');
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    await target.timeout(null, reason);

    modLogs.add(message.guildId, target.id, message.author.id, 'Unmute', reason);

    const embed = createEmbed({
      color: 0x57F287,
      description: `**${target.user.tag}** has been unmuted.\nReason: ${reason}`
    });

    await message.channel.send({ embeds: [embed] });
  }
};
