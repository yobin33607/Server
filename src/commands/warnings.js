const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils');
const { modLogs } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a member')
    .addUserOption(o => o.setName('user').setDescription('The member to check').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: 'You need the **Moderate Members** permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    const target = interaction.options.getUser('user');

    const records = modLogs.getByUser(interaction.guildId, target.id);
    const warnings = records.filter(r => r.type === 'Warn');

    if (warnings.length === 0) {
      const embed = createEmbed({
        color: 0x57F287,
        description: `**${target.tag}** has no warnings.`
      });

      return interaction.reply({ embeds: [embed] });
    }

    const list = warnings.map((w, i) =>
      `**#${i + 1}** — ${w.reason}\n<@${w.moderator_id}> • <t:${Math.floor(new Date(w.created_at).getTime() / 1000)}:R>`
    ).join('\n\n');

    const embed = createEmbed({
      description: `## Warnings for ${target.tag}\n${list}`
    });

    await interaction.reply({ embeds: [embed] });
  }
};
