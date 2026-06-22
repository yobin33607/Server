const { PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../utils');
const { modLogs } = require('../database');

module.exports = {
  name: 'warnings',
  aliases: ['warns', 'ws'],
  description: 'View warnings for a member',
  usage: '[@user]',

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply('You need the **Moderate Members** permission to use this command.');
    }

    let target = message.mentions.members.first();

    if (!target) {
      const userId = args[0];
      if (userId) {
        target = await message.guild.members.fetch(userId).catch(() => null);
      }
    }

    if (!target) {
      return message.reply('You need to mention a member to check.\nUsage: `!warnings @user`');
    }

    const records = modLogs.getByUser(message.guildId, target.id);
    const warnings = records.filter(r => r.type === 'Warn');

    if (warnings.length === 0) {
      const embed = createEmbed({
        color: 0x57F287,
        description: `**${target.user.tag}** has no warnings.`
      });

      return message.channel.send({ embeds: [embed] });
    }

    const list = warnings.map((w, i) =>
      `**#${i + 1}** — ${w.reason}\n<@${w.moderator_id}> • <t:${Math.floor(new Date(w.created_at).getTime() / 1000)}:R>`
    ).join('\n\n');

    const embed = createEmbed({
      description: `## Warnings for ${target.user.tag}\n${list}`
    });

    await message.channel.send({ embeds: [embed] });
  }
};
