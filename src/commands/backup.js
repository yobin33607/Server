const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');
const { createEmbed } = require('../utils');
const { backups } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Create a backup snapshot of the current server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guild = interaction.guild;
      const backupId = crypto.randomBytes(3).toString('hex').toUpperCase();

      const backup = {
        backupId,
        name: guild.name,
        id: guild.id,
        channels: [],
        roles: [],
        emojis: [],
        stickers: [],
        timestamp: new Date().toISOString()
      };

      const roles = await guild.roles.fetch();
      backup.roles = roles
        .map((role) => ({
          name: role.name,
          color: role.color,
          hoist: role.hoist,
          position: role.position,
          permissions: role.permissions.toArray(),
          mentionable: role.mentionable
        }))
        .filter((role) => role.name !== '@everyone');

      const channels = await guild.channels.fetch();
      backup.channels = channels.map((channel) => ({
        name: channel.name,
        type: channel.type,
        position: channel.position,
        parent: channel.parent?.name || null,
        topic: channel.topic || null,
        nsfw: channel.nsfw || false,
        bitrate: channel.bitrate || null,
        userLimit: channel.userLimit || null,
        rateLimitPerUser: channel.rateLimitPerUser || null,
        permissionOverwrites: channel.permissionOverwrites.cache.map((perm) => ({
          id: perm.id,
          type: perm.type,
          allow: perm.allow.toArray(),
          deny: perm.deny.toArray()
        }))
      }));

      const emojis = await guild.emojis.fetch();
      backup.emojis = emojis.map((emoji) => ({
        name: emoji.name,
        url: emoji.url,
        animated: emoji.animated
      }));

      const stickers = await guild.stickers.fetch();
      backup.stickers = stickers.map((sticker) => ({
        name: sticker.name,
        description: sticker.description,
        tags: sticker.tags,
        url: sticker.url
      }));

      const stored = backups.create({
        backupId,
        guildId: guild.id,
        name: guild.name,
        payload: backup
      });

      const embed = createEmbed({
        color: 0x57F287,
        description: [
          '## ✅ Backup created',
          '',
          `Backup ID: \`${backupId}\``,
          `Server: ${guild.name}`,
          `Roles: ${backup.roles.length}`,
          `Channels: ${backup.channels.length}`,
          `Emojis: ${backup.emojis.length}`,
          `Stickers: ${backup.stickers.length}`,
          '',
          `Use \`/load-backup ${backupId}\` to restore this snapshot.`
        ].join('\n')
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = createEmbed({
        color: 0xED4245,
        description: `## ❌ Backup failed\n\n${error.message}`
      });
      await interaction.editReply({ embeds: [embed] });
    }
  }
};
