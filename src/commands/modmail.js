const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modmail')
    .setDescription('Configure modmail support channels.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setup')
        .setDescription('Set modmail support and log channels.')
        .addChannelOption((option) =>
          option
            .setName('support-channel')
            .setDescription('Channel where modmail requests are routed.')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addChannelOption((option) =>
          option
            .setName('log-channel')
            .setDescription('Optional channel for modmail logs.')
            .addChannelTypes(ChannelType.GuildText)
        )
        .addChannelOption((option) =>
          option
            .setName('category')
            .setDescription('Category for created modmail threads.')
            .addChannelTypes(ChannelType.GuildCategory)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('status').setDescription('Show current modmail configuration.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('close')
        .setDescription('Close the current modmail thread channel.')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const modmailDb = interaction.client.modmail;

    if (subcommand === 'setup') {
      const supportChannel = interaction.options.getChannel('support-channel', true);
      const logChannel = interaction.options.getChannel('log-channel');
      const category = interaction.options.getChannel('category');

      const settings = modmailDb.updateGuildSettings(interaction.guildId, {
        supportChannelId: supportChannel.id,
        logChannelId: logChannel?.id ?? null,
        categoryId: category?.id ?? null,
        enabled: true
      });

      const embed = createEmbed({
        color: 0x57F287,
        description: `Modmail has been configured.

Support channel: <#${settings.support_channel_id}>
Log channel: ${settings.log_channel_id ? `<#${settings.log_channel_id}>` : 'None'}
Category: ${settings.category_id ? `<#${settings.category_id}>` : 'None'}`
      });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcommand === 'status') {
      const settings = modmailDb.getGuild(interaction.guildId);
      if (!settings) {
        return interaction.reply({ content: 'Modmail is not configured for this server.', flags: MessageFlags.Ephemeral });
      }

      const embed = createEmbed({
        color: 0x5865F2,
        description: `Modmail configuration for ${interaction.guild.name}:

Status: ${settings.enabled ? 'Enabled' : 'Disabled'}
Support channel: ${settings.support_channel_id ? `<#${settings.support_channel_id}>` : 'Not set'}
Log channel: ${settings.log_channel_id ? `<#${settings.log_channel_id}>` : 'Not set'}
Category: ${settings.category_id ? `<#${settings.category_id}>` : 'Not set'}`
      });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcommand === 'close') {
      const thread = modmailDb.getThreadByChannel(interaction.channelId);
      if (!thread) {
        return interaction.reply({ content: 'This channel is not a modmail thread.', flags: MessageFlags.Ephemeral });
      }

      if (thread.status === 'closed') {
        return interaction.reply({ content: 'This thread is already closed.', flags: MessageFlags.Ephemeral });
      }

      modmailDb.closeThread(interaction.channelId);
      await interaction.channel.send({ content: 'This modmail thread has been closed by staff.' });

      return interaction.reply({ content: 'The thread has been closed.', flags: MessageFlags.Ephemeral });
    }

    return interaction.reply({ content: 'Unknown subcommand.', flags: MessageFlags.Ephemeral });
  }
};
