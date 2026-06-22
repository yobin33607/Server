const { PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  name: 'nick',
  aliases: ['nickname', 'setnick'],
  description: 'Change a member\'s nickname',
  usage: '<@user> <new nickname>',

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      return message.reply('You need the **Manage Nicknames** permission to use this command.');
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      return message.reply('I need the **Manage Nicknames** permission to do that.');
    }

    const target = message.mentions.members.first();
    if (!target) {
      return message.reply('You need to mention a member.\nUsage: `!nick @user New Nickname`');
    }

    if (!target.moderatable) {
      return message.reply('I cannot change that member\'s nickname.');
    }

    if (target.id === message.author.id) {
      return message.reply('You can change your own nickname by right-clicking your name or using Discord profile settings.');
    }

    if (target.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
      return message.reply('You cannot change the nickname of a member with equal or higher role than you.');
    }

    const nickname = args.slice(1).join(' ').trim();
    if (!nickname) {
      return message.reply('You need to provide a new nickname.\nUsage: `!nick @user New Nickname`');
    }

    if (nickname.length > 32) {
      return message.reply('Nickname must be 32 characters or fewer.');
    }

    const oldNick = target.nickname || target.user.displayName;
    await target.setNickname(nickname);

    const embed = createEmbed({
      color: 0x57F287,
      description: `Changed **${target.user.tag}**'s nickname.\n**Before:** ${oldNick}\n**After:** ${nickname}`
    });

    await message.channel.send({ embeds: [embed] });
  }
};
