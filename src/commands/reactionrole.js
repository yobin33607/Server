const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils');

const CUSTOM_EMOJI_REGEX = /^<a?:([^:>]+):(\d+)>$/;

function normalizeEmoji(input) {
  const cleaned = input.trim();
  const match = cleaned.match(CUSTOM_EMOJI_REGEX);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }
  return cleaned;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Create and manage reaction role assignments.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add a reaction role mapping to a message.')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel containing the message.')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('message-id')
            .setDescription('ID of the target message.')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('emoji')
            .setDescription('Emoji to use for this reaction role.')
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option.setName('role').setDescription('Role assigned when the reaction is added.').setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove a reaction role mapping from a message.')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel containing the message.')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('message-id')
            .setDescription('ID of the target message.')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('emoji')
            .setDescription('Emoji used for the reaction role.')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('List reaction role mappings for this guild.')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Filter by channel.')
            .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption((option) =>
          option
            .setName('message-id')
            .setDescription('Filter by message ID.')
        )
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: 'You need the **Manage Roles** permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: 'I need the **Manage Roles** permission to set up reaction roles.', flags: MessageFlags.Ephemeral });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      const channel = interaction.options.getChannel('channel', true);
      const messageId = interaction.options.getString('message-id', true);
      const emojiInput = interaction.options.getString('emoji', true);
      const role = interaction.options.getRole('role', true);

      const emojiKey = normalizeEmoji(emojiInput);
      if (!emojiKey) {
        return interaction.reply({ content: 'Please provide a valid emoji or custom emoji.', flags: MessageFlags.Ephemeral });
      }

      if (role.managed) {
        return interaction.reply({ content: 'I cannot assign a bot-managed role for reaction roles.', flags: MessageFlags.Ephemeral });
      }

      if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({ content: 'That role is higher than my highest role, so I cannot manage it.', flags: MessageFlags.Ephemeral });
      }

      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (!message) {
        return interaction.reply({ content: 'I could not find that message in the specified channel.', flags: MessageFlags.Ephemeral });
      }

      const existing = interaction.client.reactionRoles.getRule(interaction.guildId, channel.id, message.id, emojiKey);
      if (existing) {
        return interaction.reply({ content: 'A reaction role using that emoji already exists for this message.', flags: MessageFlags.Ephemeral });
      }

      try {
        await message.react(emojiKey);
      } catch (error) {
        return interaction.reply({ content: 'I could not react with that emoji. Please make sure it is valid and available in this server.', flags: MessageFlags.Ephemeral });
      }

      interaction.client.reactionRoles.addRule(interaction.guildId, channel.id, message.id, emojiKey, role.id);

      const embed = createEmbed({
        color: 0x57F287,
        description: `Added reaction role:

Channel: ${channel}
Message: [Jump to message](${message.url})
Emoji: ${emojiInput}
Role: ${role}`
      });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcommand === 'remove') {
      const channel = interaction.options.getChannel('channel', true);
      const messageId = interaction.options.getString('message-id', true);
      const emojiInput = interaction.options.getString('emoji', true);
      const emojiKey = normalizeEmoji(emojiInput);

      if (!emojiKey) {
        return interaction.reply({ content: 'Please provide a valid emoji or custom emoji.', flags: MessageFlags.Ephemeral });
      }

      const row = interaction.client.reactionRoles.removeRule(interaction.guildId, channel.id, messageId, emojiKey);
      if (!row) {
        return interaction.reply({ content: 'No matching reaction role mapping was found for that message and emoji.', flags: MessageFlags.Ephemeral });
      }

      const embed = createEmbed({
        color: 0xED4245,
        description: `Removed reaction role mapping for ${emojiInput} on <#${row.channel_id}> message ID ${row.message_id}.`
      });

      try {
        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (message) {
          const reaction = message.reactions.resolve(emojiKey);
          if (reaction) {
            await reaction.remove().catch(() => {});
          }
        }
      } catch {
        // ignore failures cleaning up reaction buttons
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcommand === 'list') {
      const channel = interaction.options.getChannel('channel');
      const messageId = interaction.options.getString('message-id');
      const rows = interaction.client.reactionRoles.getRulesByGuild(interaction.guildId, channel?.id ?? null);
      const filtered = messageId ? rows.filter((row) => row.message_id === messageId) : rows;

      if (filtered.length === 0) {
        return interaction.reply({ content: 'No reaction role mappings were found.', flags: MessageFlags.Ephemeral });
      }

      const description = filtered
        .map((row) => {
          const channelText = `<#${row.channel_id}>`;
          const messageLink = `https://discord.com/channels/${interaction.guildId}/${row.channel_id}/${row.message_id}`;
          const roleText = `<@&${row.role_id}>`;
          return `**${row.emoji}** → ${roleText}
Channel: ${channelText}
Message: [Jump](${messageLink})`;
        })
        .join('\n\n');

      const embed = createEmbed({
        color: 0x5865F2,
        description
      });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    return interaction.reply({ content: 'Unknown subcommand.', flags: MessageFlags.Ephemeral });
  }
};
