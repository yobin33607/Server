const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('membercount')
    .setDescription('Show server member statistics'),

  async execute(interaction) {
    const guild = interaction.guild;

    const total = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = total - bots;

    const online = guild.members.cache.filter(m =>
      m.presence?.status === 'online'
    ).size;

    const embed = createEmbed({
      description: [
        `## ${guild.name} — Members`,
        '',
        `**Total:** ${total.toLocaleString()}`,
        `**Users:** ${humans.toLocaleString()}`,
        `**Bots:** ${bots.toLocaleString()}`,
        `**Online:** ${online.toLocaleString()}`
      ].join('\n')
    });

    await interaction.reply({ embeds: [embed] });
  }
};
