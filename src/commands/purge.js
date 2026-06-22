const { PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  name: 'purge',
  aliases: ['clear', 'pr'],
  description: 'Delete a number of recent messages',
  usage: '<1-100>',

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply('You need the **Manage Messages** permission to use this command.');
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply('I need the **Manage Messages** permission to do that.');
    }

    const amount = parseInt(args[0]);

    if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply('You need to specify a number between 1 and 100.\nUsage: `!purge 10`');
    }

    const messages = await message.channel.bulkDelete(amount, true);

    const embed = createEmbed({
      color: 0x57F287,
      description: `Deleted ${messages.size} message${messages.size !== 1 ? 's' : ''}.`
    });

    const reply = await message.channel.send({ embeds: [embed] });
    setTimeout(() => reply.delete().catch(() => {}), 3000);
  }
};
