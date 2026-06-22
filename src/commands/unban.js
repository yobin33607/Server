const { PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../utils');
const { modLogs } = require('../database');

module.exports = {
  name: 'unban',
  aliases: ['ub'],
  description: 'Unban a user from the server',
  usage: '<user ID> [reason]',

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply('You need the **Ban Members** permission to use this command.');
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply('I need the **Ban Members** permission to do that.');
    }

    const userId = args[0];
    if (!userId) {
      return message.reply('You need to provide a user ID to unban.\nUsage: `!unban <user ID> [reason]`');
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      const banList = await message.guild.bans.fetch();
      const banned = banList.get(userId);

      if (!banned) {
        return message.reply('That user is not banned from this server.');
      }

      await message.guild.members.unban(userId, reason);

      modLogs.add(message.guildId, userId, message.author.id, 'Unban', reason);

      const embed = createEmbed({
        color: 0x57F287,
        description: `**${banned.user.tag}** has been unbanned.\nReason: ${reason}`
      });

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      if (error.code === 10013) {
        return message.reply('That user is not banned from this server.');
      }
      throw error;
    }
  }
};
