const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Show information about this server'),

  async execute(interaction) {
    const guild = interaction.guild;
    await guild.fetch();

    const owner = await guild.fetchOwner();

    const channels = guild.channels.cache;
    const textChannels = channels.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size;
    const categoryChannels = channels.filter(c => c.type === ChannelType.GuildCategory).size;

    const totalMembers = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = totalMembers - bots;

    const boostCount = guild.premiumSubscriptionCount || 0;
    const boostLevel = guild.premiumTier;

    const embed = createEmbed({
      description: [
        `## ${guild.name}`,
        '',
        `**Owner:** ${owner.user.tag}`,
        `**ID:** ${guild.id}`,
        `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
        `**Region:** ${guild.preferredLocale || 'Unknown'}`,
        '',
        `**Members:** ${totalMembers} (${humans} users, ${bots} bots)`,
        `**Channels:** ${textChannels} Text | ${voiceChannels} Voice | ${categoryChannels} Categories`,
        `**Boost Level:** ${boostLevel} (${boostCount} boosts)`,
        `**Roles:** ${guild.roles.cache.size}`,
        `**Emojis:** ${guild.emojis.cache.size}`
      ].join('\n')
    }).setThumbnail(guild.iconURL({ size: 1024 }));

    await interaction.reply({ embeds: [embed] });
  }
};
