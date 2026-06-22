const { PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  name: 'unlock',
  aliases: ['unlockdown'],
  description: 'Unlock a previously locked channel',

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('You need the **Manage Channels** permission to use this command.');
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('I need the **Manage Channels** permission to do that.');
    }

    const channel = message.channel;

    await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
      SendMessages: true
    });

    const embed = createEmbed({
      color: 0x57F287,
      description: `🔓 ${channel} has been unlocked.`
    });

    await channel.send({ embeds: [embed] });
  }
};
