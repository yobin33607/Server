const { createEmbed } = require('../utils');

module.exports = {
  name: 'emojilist',
  aliases: ['emojis', 'el'],
  description: 'List all server emojis',

  async execute(message) {
    const { guild } = message;
    const emojis = guild.emojis.cache;

    if (!emojis.size) {
      return message.reply('This server has no emojis.');
    }

    const animated = emojis.filter(e => e.animated).map(e => `${e} — \`:${e.name}:\``);
    const static = emojis.filter(e => !e.animated).map(e => `${e} — \`:${e.name}:\``);

    const lines = [];

    if (animated.length) {
      lines.push(`### Animated (${animated.length})`);
      lines.push(...animated);
    }

    if (static.length) {
      lines.push(`### Static (${static.length})`);
      lines.push(...static);
    }

    const chunks = [];
    for (let i = 0; i < lines.length; i += 20) {
      chunks.push(lines.slice(i, i + 20).join('\n'));
    }

    const embeds = chunks.map((chunk, i) =>
      createEmbed({
        description: i === 0
          ? `## ${guild.name} — Emojis (${emojis.size})\n${chunk}`
          : chunk
      })
    );

    for (const embed of embeds) {
      await message.channel.send({ embeds: [embed] });
    }
  }
};
