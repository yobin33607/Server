const { PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../utils');
const { modLogs } = require('../database');

module.exports = {
  name: 'warn',
  aliases: ['w'],
  description: 'Warn a member',
  usage: '<@user> [reason]',

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply('You need the **Moderate Members** permission to use this command.');
    }

    const target = message.mentions.members.first();
    if (!target) {
      return message.reply('You need to mention a member to warn.\nUsage: `!warn @user [reason]`');
    }

    if (target.id === message.author.id) {
      return message.reply('You cannot warn yourself.');
    }

    if (target.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
      return message.reply('You cannot warn a member with equal or higher role than you.');
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    modLogs.add(message.guildId, target.id, message.author.id, 'Warn', reason);

    await target.send({
      embeds: [createEmbed({
        color: 0xFEE75C,
        description: `You have been warned in **${message.guild.name}**.\nReason: ${reason}`
      })]
    }).catch(() => {});

    const embed = createEmbed({
      color: 0xFEE75C,
      description: `**${target.user.tag}** has been warned.\nReason: ${reason}`
    });

    await message.channel.send({ embeds: [embed] });
  }
};
