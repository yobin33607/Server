const { PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  name: 'nuke',
  aliases: ['clone'],
  description: 'Clone and delete a channel for a clean reset',

  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('You need the **Manage Channels** permission to use this command.');
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('I need the **Manage Channels** permission to do that.');
    }

    const channel = message.channel;
    const position = channel.position;

    const newChannel = await channel.clone({
      name: channel.name,
      permissionOverwrites: channel.permissionOverwrites.cache,
      topic: channel.topic,
      nsfw: channel.nsfw,
      rateLimitPerUser: channel.rateLimitPerUser
    });

    await newChannel.setPosition(position);
    await channel.delete();

    const embed = createEmbed({
      description: '🧹 Channel has been nuked and recreated.'
    });

    await newChannel.send({ embeds: [embed] });
  }
};
