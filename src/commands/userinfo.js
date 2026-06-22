const { createEmbed } = require('../utils');

module.exports = {
  name: 'userinfo',
  aliases: ['ui', 'whois', 'user'],
  description: 'Show information about a user',
  usage: '[@user]',

  async execute(message, args) {
    let target = message.mentions.members.first() || message.member;

    if (!target && args[0]) {
      try {
        target = await message.guild.members.fetch(args[0]);
      } catch {
        return message.reply('Could not find that user.');
      }
    }

    const roles = target.roles.cache
      .filter(r => r.id !== message.guild.id)
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

    await message.channel.send({ embeds: [embed] });
  }
};
