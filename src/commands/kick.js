const { PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../utils');
const { modLogs } = require('../database');

module.exports = {
  name: 'kick',
  aliases: ['k'],
  description: 'Kick a member from the server',
  usage: '<@user> [reason]',

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply('You need the **Kick Members** permission to use this command.');
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply('I need the **Kick Members** permission to do that.');
    }

    const target = message.mentions.members.first();
    if (!target) {
      return message.reply('You need to mention a member to kick.\nUsage: `!kick @user [reason]`');
    }

    if (!target.kickable) {
      return message.reply('I cannot kick that member. They may have higher permissions than me.');
    }

    if (target.id === message.author.id) {
      return message.reply('You cannot kick yourself.');
    }

    if (target.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
      return message.reply('You cannot kick a member with equal or higher role than you.');
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    await target.send({
      embeds: [createEmbed({
        color: 0xED4245,
        description: `You have been kicked from **${message.guild.name}**.\nReason: ${reason}`
      })]
    }).catch(() => {});

    await target.kick(reason);

    modLogs.add(message.guildId, target.id, message.author.id, 'Kick', reason);

    const embed = createEmbed({
      color: 0xED4245,
      description: `**${target.user.tag}** has been kicked.\nReason: ${reason}`
    });

    await message.channel.send({ embeds: [embed] });
  }
};
