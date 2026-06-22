const { createEmbed } = require('../utils');

module.exports = {
  name: 'avatar',
  aliases: ['pf', 'profilepic'],
  description: 'Show a user\'s avatar',
  usage: '[@user]',

  async execute(message, args) {
    let target = message.mentions.users.first();

    if (!target && args[0]) {
      try {
        target = await message.client.users.fetch(args[0]);
      } catch {
        return message.reply('Could not find that user.');
      }
    }

    if (!target) target = message.author;

    const avatarURL = target.displayAvatarURL({ size: 1024 });
    const embed = createEmbed({
      description: `${target.tag}'s avatar`
    })
      .setImage(avatarURL);

    await message.channel.send({ embeds: [embed] });
  }
};
