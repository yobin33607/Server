const { createEmbed } = require('../utils');

module.exports = {
  name: 'membercount',
  aliases: ['members', 'mc'],
  description: 'Show server member statistics',

  async execute(message) {
    const { guild } = message;

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

    await message.channel.send({ embeds: [embed] });
  }
};
