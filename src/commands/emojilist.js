const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emojilist')
    .setDescription('List all server emojis'),

  async execute(interaction) {
    const guild = interaction.guild;
    const emojis = guild.emojis.cache;

    if (!emojis.size) {
      return interaction.reply({ content: 'This server has no emojis.', flags: MessageFlags.Ephemeral });
    }

    const animated = emojis.filter(e => e.animated).map(e => `${e} — \`:${e.name}:\``);
    const staticEmojis = emojis.filter(e => !e.animated).map(e => `${e} — \`:${e.name}:\``);

    const lines = [];

    if (animated.length) {
      lines.push(`### Animated (${animated.length})`);
      lines.push(...animated);
    }

    if (staticEmojis.length) {
      lines.push(`### Static (${staticEmojis.length})`);
      lines.push(...staticEmojis);
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

    await interaction.reply({ embeds: [embeds[0]] });

    for (const embed of embeds.slice(1)) {
      await interaction.followUp({ embeds: [embed] });
    }
  }
};
