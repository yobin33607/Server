const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Clone and delete this channel for a clean reset')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: 'You need the **Manage Channels** permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: 'I need the **Manage Channels** permission to do that.', flags: MessageFlags.Ephemeral });
    }

    const channel = interaction.channel;
    const position = channel.position;

    await interaction.reply({ content: 'Nuking this channel...', flags: MessageFlags.Ephemeral }).catch(() => {});

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
