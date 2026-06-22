const { PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  name: 'slowmode',
  aliases: ['sm'],
  description: 'Set slowmode for the current channel',
  usage: '<seconds | off>',

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('You need the **Manage Channels** permission to use this command.');
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('I need the **Manage Channels** permission to do that.');
    }

    const input = args[0]?.toLowerCase();

    if (!input) {
      return message.reply('You need to specify a duration in seconds or `off`.\nUsage: `!slowmode 5` to set 5s, `!slowmode off` to disable.');
    }

    let seconds;

    if (input === 'off' || input === '0' || input === 'disable') {
      seconds = 0;
    } else {
      seconds = parseInt(input);

      if (isNaN(seconds) || seconds < 0) {
        return message.reply('Invalid value. Use a number between 0 and 21600, or `off`.');
      }

      if (seconds > 21600) {
        return message.reply('Slowmode cannot exceed 21600 seconds (6 hours).');
      }
    }

    await message.channel.setRateLimitPerUser(seconds);

    const display = seconds === 0 ? 'disabled' : `${seconds} second${seconds !== 1 ? 's' : ''}`;

    const embed = createEmbed({
      color: 0x57F287,
      description: `Slowmode has been set to **${display}** for ${message.channel}.`
    });

    await message.channel.send({ embeds: [embed] });
  }
};
