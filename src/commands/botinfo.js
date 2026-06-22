const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, SUPPORT_LINK } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Show information about the bot'),

  async execute(interaction) {
    const { client } = interaction;
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

    const embed = createEmbed({
      description: [
        '## Cortex Realm Bot',
        '',
        `**Commands:** ${client.commands.size}`,
        `**Servers:** ${client.guilds.cache.size}`,
        `**Users:** ${totalUsers.toLocaleString()}`,
        `**Uptime:** ${days}d ${hours}h ${minutes}m`,
        `**Ping:** ${Math.round(client.ws.ping)}ms`,
        `**Library:** discord.js v14`,
        `**Node.js:** ${process.version}`,
        '',
        `[Support Server](${SUPPORT_LINK})`
      ].join('\n')
    }).setThumbnail(client.user.displayAvatarURL());

    await interaction.reply({ embeds: [embed] });
  }
};
