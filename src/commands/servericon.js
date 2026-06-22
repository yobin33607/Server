const { createEmbed } = require('../utils');

module.exports = {
  name: 'servericon',
  aliases: ['icon', 'guildicon'],
  description: 'Show the server icon',

  async execute(message) {
    const { guild } = message;
    const iconURL = guild.iconURL({ size: 1024 });

    if (!iconURL) {
      return message.reply('This server does not have an icon.');
    }

    const embed = createEmbed({
      description: `${guild.name}'s server icon`
    }).setImage(iconURL);

    await message.channel.send({ embeds: [embed] });
  }
};
