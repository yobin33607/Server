const { createEmbed } = require('../utils');

module.exports = {
  name: 'help',
  aliases: ['h', 'commands'],
  description: 'Show available commands',

  async execute(message) {
    const seen = new Set();
    const commands = [];

    for (const cmd of message.client.commands.values()) {
      if (seen.has(cmd.name)) continue;
      seen.add(cmd.name);

      const aliases = cmd.aliases?.length ? ` (${cmd.aliases.join(', ')})` : '';
      commands.push(`**${message.client.prefix}${cmd.name}**${aliases} — ${cmd.description}`);
    }

    const embed = createEmbed({
      description: `## Cortex Realm Bot\n\n${commands.join('\n')}\n\n[Join Support Server](https://discord.gg/EWr3GgP6fe)`
    });

    await message.channel.send({ embeds: [embed] });
  }
};
