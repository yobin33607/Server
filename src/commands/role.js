const { PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  name: 'role',
  aliases: ['roles'],
  description: 'Manage roles for a member (add, remove, toggle)',
  usage: '<add|remove|toggle> <@user> <@role | role name | role ID>',

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.reply('You need the **Manage Roles** permission to use this command.');
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.reply('I need the **Manage Roles** permission to do that.');
    }

    const action = args[0]?.toLowerCase();
    if (!action || !['add', 'remove', 'toggle'].includes(action)) {
      return message.reply('You need to specify an action: `add`, `remove`, or `toggle`.\nUsage: `!role add @user @role`');
    }

    const target = message.mentions.members.first();
    if (!target) {
      return message.reply('You need to mention a member.\nUsage: `!role add @user @role`');
    }

    if (target.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
      return message.reply('You cannot manage roles for a member with equal or higher role than you.');
    }

    const roleArg = args.slice(2).join(' ');
    if (!roleArg) {
      return message.reply('You need to specify a role.\nUsage: `!role add @user @role`');
    }

    const role = message.mentions.roles.first()
      || message.guild.roles.cache.find(r => r.name.toLowerCase() === roleArg.toLowerCase())
      || message.guild.roles.cache.get(roleArg);

    if (!role) {
      return message.reply('Could not find that role. Use @mention, role name, or role ID.');
    }

    if (role.managed) {
      return message.reply('I cannot manage bot-managed roles (e.g., booster roles).');
    }

    if (role.position >= message.guild.members.me.roles.highest.position) {
      return message.reply('That role is higher than my highest role, so I cannot manage it.');
    }

    if (role.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
      return message.reply('You cannot manage a role that is equal to or higher than your highest role.');
    }

    const hasRole = target.roles.cache.has(role.id);

    if (action === 'add') {
      if (hasRole) {
        return message.reply(`**${target.user.tag}** already has the ${role} role.`);
      }
      await target.roles.add(role);
    } else if (action === 'remove') {
      if (!hasRole) {
        return message.reply(`**${target.user.tag}** does not have the ${role} role.`);
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

    await message.channel.send({ embeds: [embed] });
  }
};
