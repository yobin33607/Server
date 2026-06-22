const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show information about a user')
    .addUserOption(o => o.setName('user').setDescription('The member to show (defaults to you)')),

  async execute(interaction) {
    const target = interaction.options.getMember('user') || interaction.member;

    if (!target) {
      return interaction.reply({ content: 'That user is not a member of this server.', flags: MessageFlags.Ephemeral });
    }

    const roles = target.roles.cache
      .filter(r => r.id !== interaction.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => r.toString());

    const embed = createEmbed({
      description: [
        `## ${target.user.tag}`,
        '',
        `**ID:** ${target.id}`,
        `**Nickname:** ${target.nickname || 'None'}`,
        `**Bot:** ${target.user.bot ? 'Yes' : 'No'}`,
        `**Account Created:** <t:${Math.floor(target.user.createdTimestamp / 1000)}:R>`,
        `**Joined Server:** <t:${Math.floor(target.joinedTimestamp / 1000)}:R>`,
        `**Roles [${roles.length}]:** ${roles.join(' ') || 'None'}`,
        `**Highest Role:** ${target.roles.highest.name}`
      ].join('\n')
    })
      .setThumbnail(target.user.displayAvatarURL({ size: 1024 }));

    await interaction.reply({ embeds: [embed] });
  }
};
