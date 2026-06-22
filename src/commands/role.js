const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Manage roles for a member (add, remove, toggle)')
    .addStringOption(o => o.setName('action').setDescription('What to do with the role').setRequired(true)
      .addChoices(
        { name: 'Add', value: 'add' },
        { name: 'Remove', value: 'remove' },
        { name: 'Toggle', value: 'toggle' }
      ))
    .addUserOption(o => o.setName('user').setDescription('The member to update').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('The role to add, remove, or toggle').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: 'You need the **Manage Roles** permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: 'I need the **Manage Roles** permission to do that.', flags: MessageFlags.Ephemeral });
    }

    const action = interaction.options.getString('action');

    const target = interaction.options.getMember('user');
    if (!target) {
      return interaction.reply({ content: 'That user is not a member of this server.', flags: MessageFlags.Ephemeral });
    }

    if (target.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: 'You cannot manage roles for a member with equal or higher role than you.', flags: MessageFlags.Ephemeral });
    }

    const role = interaction.options.getRole('role');

    if (role.managed) {
      return interaction.reply({ content: 'I cannot manage bot-managed roles (e.g., booster roles).', flags: MessageFlags.Ephemeral });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ content: 'That role is higher than my highest role, so I cannot manage it.', flags: MessageFlags.Ephemeral });
    }

    if (role.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: 'You cannot manage a role that is equal to or higher than your highest role.', flags: MessageFlags.Ephemeral });
    }

    const hasRole = target.roles.cache.has(role.id);

    if (action === 'add') {
      if (hasRole) {
        return interaction.reply({ content: `**${target.user.tag}** already has the ${role} role.`, flags: MessageFlags.Ephemeral });
      }
      await target.roles.add(role);
    } else if (action === 'remove') {
      if (!hasRole) {
        return interaction.reply({ content: `**${target.user.tag}** does not have the ${role} role.`, flags: MessageFlags.Ephemeral });
      }
      await target.roles.remove(role);
    } else {
      if (hasRole) {
        await target.roles.remove(role);
      } else {
        await target.roles.add(role);
      }
    }

    const actionLabel = action === 'toggle'
      ? (hasRole ? 'removed from' : 'added to')
      : (action === 'add' ? 'added to' : 'removed from');

    const embed = createEmbed({
      color: 0x57F287,
      description: `Role ${role} has been **${actionLabel}** **${target.user.tag}**.`
    });

    await interaction.reply({ embeds: [embed] });
  }
};
