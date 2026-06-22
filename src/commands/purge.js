const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete a number of recent messages')
    .addIntegerOption(o => o.setName('amount').setDescription('How many messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: 'You need the **Manage Messages** permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: 'I need the **Manage Messages** permission to do that.', flags: MessageFlags.Ephemeral });
    }

    const amount = interaction.options.getInteger('amount');

    const messages = await interaction.channel.bulkDelete(amount, true);

    const embed = createEmbed({
      color: 0x57F287,
      description: `Deleted ${messages.size} message${messages.size !== 1 ? 's' : ''}.`
    });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};
