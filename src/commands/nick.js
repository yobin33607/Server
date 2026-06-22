const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nick')
    .setDescription("Change a member's nickname")
    .addUserOption(o => o.setName('user').setDescription('The member to rename').setRequired(true))
    .addStringOption(o => o.setName('nickname').setDescription('The new nickname (max 32 chars)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      return interaction.reply({ content: 'You need the **Manage Nicknames** permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      return interaction.reply({ content: 'I need the **Manage Nicknames** permission to do that.', flags: MessageFlags.Ephemeral });
    }

    const target = interaction.options.getMember('user');
    if (!target) {
      return interaction.reply({ content: 'That user is not a member of this server.', flags: MessageFlags.Ephemeral });
    }

    if (!target.moderatable) {
      return interaction.reply({ content: "I cannot change that member's nickname.", flags: MessageFlags.Ephemeral });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: 'You can change your own nickname by right-clicking your name or using Discord profile settings.', flags: MessageFlags.Ephemeral });
    }

    if (target.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: 'You cannot change the nickname of a member with equal or higher role than you.', flags: MessageFlags.Ephemeral });
    }

    const nickname = interaction.options.getString('nickname').trim();

    if (nickname.length > 32) {
      return interaction.reply({ content: 'Nickname must be 32 characters or fewer.', flags: MessageFlags.Ephemeral });
    }

    const oldNick = target.nickname || target.user.displayName;
    await target.setNickname(nickname);

    const embed = createEmbed({
      color: 0x57F287,
      description: `Changed **${target.user.tag}**'s nickname.\n**Before:** ${oldNick}\n**After:** ${nickname}`
    });

    await interaction.reply({ embeds: [embed] });
  }
};
