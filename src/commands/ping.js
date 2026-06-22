const { createEmbed } = require('../utils');

module.exports = {
  name: 'ping',
  aliases: ['p', 'latency'],
  description: 'Check the bot latency',

  async execute(message) {
    const sent = await message.channel.send('Pong!');
    const latency = sent.createdTimestamp - message.createdTimestamp;

    const embed = createEmbed({
      description: `🏓 Pong!\nLatency: ${latency}ms\nAPI Latency: ${Math.round(message.client.ws.ping)}ms`
    });

    await sent.edit({ content: null, embeds: [embed] });
  }
};
