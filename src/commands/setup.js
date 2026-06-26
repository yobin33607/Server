const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure server setup options.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('modmail')
        .setDescription('Configure modmail support channels.')
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
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand !== 'modmail') {
      return interaction.reply({ content: 'Invalid setup option.', ephemeral: true });
    }

    const supportChannel = interaction.options.getChannel('support-channel', true);
    const logChannel = interaction.options.getChannel('log-channel');
    const category = interaction.options.getChannel('category');

    const settings = interaction.client.modmail.updateGuildSettings(interaction.guildId, {
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
};
