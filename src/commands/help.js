const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),

  async execute(interaction) {
    const commands = [...interaction.client.commands.values()]
      .map((cmd) => {
        const json = cmd.data.toJSON();
        const subcommands = Array.isArray(json.options)
          ? json.options
              .filter((opt) => opt.type === 1)
              .map((opt) => `**/${json.name} ${opt.name}** — ${opt.description}`)
          : [];

        return [`**/${json.name}** — ${json.description}`, ...subcommands].join('\n');
      })
      .flat()
      .sort();

    const embed = createEmbed({
      description: `## Byte Labs Server Bot\n\n${commands.join('\n')}\n\n[Join Support Server](https://discord.gg/wZuTsF5Z2P)`
    });

    await interaction.reply({ embeds: [embed] });
  }
};
