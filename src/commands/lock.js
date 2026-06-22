const { PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  name: 'lock',
  aliases: ['lockdown'],
  description: 'Lock a channel to prevent @everyone from sending messages',

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('You need the **Manage Channels** permission to use this command.');
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('I need the **Manage Channels** permission to do that.');
    }

    const channel = message.channel;

    await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
      SendMessages: false
    });

    const embed = createEmbed({
      color: 0xED4245,
      description: `🔒 ${channel} has been locked.`
    });

    await channel.send({ embeds: [embed] });
  }
};
