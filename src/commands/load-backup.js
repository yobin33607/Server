const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { createEmbed } = require('../utils');
const { backups } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('load-backup')
    .setDescription('Restore a previously created backup into this server')
    .addStringOption((option) =>
      option.setName('backup-id').setDescription('The backup ID to restore').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const backupId = interaction.options.getString('backup-id');
      const guild = interaction.guild;
      const backupRow = backups.getById(backupId);

      if (!backupRow) {
        return interaction.editReply({ content: 'No backup with that ID was found.' });
      }

      const backupData = JSON.parse(backupRow.payload);
      const hasCommunityFeatures = backupData.channels.some((channel) => [ChannelType.GuildForum, ChannelType.GuildAnnouncement].includes(channel.type));

      if (hasCommunityFeatures && !guild.features.includes('COMMUNITY')) {
        return interaction.editReply({ content: 'This backup contains community-only channels, but the target server is not a Community server.' });
      }

      await interaction.editReply({ content: `⚠️ This will replace the current server structure. Reply with \`confirm\` within 30 seconds to continue.` });

      const filter = (message) => message.author.id === interaction.user.id && message.content.toLowerCase() === 'confirm';
      const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

      collector.on('collect', async () => {
        const statusChannel = await guild.channels.create({ name: 'backup-status', type: ChannelType.GuildText });

        const sendStatus = async (message, embed) => {
          if (embed) {
            await statusChannel.send({ embeds: [embed] });
            return;
          }
          await statusChannel.send(message);
        };

        try {
          await sendStatus('Starting backup restoration...', new EmbedBuilder().setColor(0xFEE75C).setTitle('Backup restoration started').setTimestamp());

          const roles = await guild.roles.fetch();
          for (const role of roles.values()) {
            if (role.name !== '@everyone' && role.position < guild.members.me.roles.highest.position) {
              await role.delete().catch(() => {});
            }
          }

          const channels = await guild.channels.fetch();
          for (const channel of channels.values()) {
            if (channel.id !== statusChannel.id) {
              try {
                await channel.delete();
              } catch (error) {
                if (error.code !== 50074) {
                  console.error(error);
                }
              }
            }
          }

          const emojis = await guild.emojis.fetch();
          for (const emoji of emojis.values()) {
            await emoji.delete().catch(() => {});
          }

          const stickers = await guild.stickers.fetch();
          for (const sticker of stickers.values()) {
            await sticker.delete().catch(() => {});
          }

          await sendStatus('Restoring roles...', new EmbedBuilder().setColor(0x5865F2).setTitle('Restoring roles').setTimestamp());
          const sortedRoles = [...backupData.roles].sort((a, b) => b.position - a.position);
          for (const roleData of sortedRoles) {
            await guild.roles.create({
              name: roleData.name,
              color: roleData.color,
              hoist: roleData.hoist,
              permissions: roleData.permissions,
              mentionable: roleData.mentionable
            }).catch(() => {});
          }

          await sendStatus('Restoring channels...', new EmbedBuilder().setColor(0x5865F2).setTitle('Restoring channels').setTimestamp());
          const categoryMap = new Map();
          const categories = backupData.channels.filter((channel) => channel.type === ChannelType.GuildCategory).sort((a, b) => a.position - b.position);
          for (const categoryData of categories) {
            const category = await guild.channels.create({
              name: categoryData.name,
              type: ChannelType.GuildCategory,
              position: categoryData.position,
              permissionOverwrites: categoryData.permissionOverwrites
            }).catch(() => null);
            if (category) categoryMap.set(categoryData.name, category);
          }

          const nonCategories = backupData.channels.filter((channel) => channel.type !== ChannelType.GuildCategory).sort((a, b) => {
            if (a.type !== b.type) {
              const typePriority = {
                [ChannelType.GuildAnnouncement]: 0,
                [ChannelType.GuildText]: 1,
                [ChannelType.GuildForum]: 2,
                [ChannelType.GuildVoice]: 3,
                [ChannelType.GuildStageVoice]: 4
              };
              return (typePriority[a.type] || 99) - (typePriority[b.type] || 99);
            }
            return a.position - b.position;
          });

          for (const channelData of nonCategories) {
            const parent = channelData.parent ? categoryMap.get(channelData.parent) : null;
            try {
              await guild.channels.create({
                name: channelData.name,
                type: channelData.type,
                parent: parent?.id,
                topic: channelData.topic,
                nsfw: channelData.nsfw,
                bitrate: channelData.bitrate,
                userLimit: channelData.userLimit,
                rateLimitPerUser: channelData.rateLimitPerUser,
                position: channelData.position,
                permissionOverwrites: channelData.permissionOverwrites
              });
            } catch (error) {
              await sendStatus(`Failed to restore channel ${channelData.name}: ${error.message}`);
            }
          }

          await sendStatus('Restoring emojis and stickers...', new EmbedBuilder().setColor(0x5865F2).setTitle('Restoring emojis and stickers').setTimestamp());
          for (const emojiData of backupData.emojis) {
            try {
              await guild.emojis.create({ attachment: emojiData.url, name: emojiData.name, reason: 'Backup restore' });
            } catch (error) {
              await sendStatus(`Failed to restore emoji ${emojiData.name}: ${error.message}`);
            }
          }

          for (const stickerData of backupData.stickers) {
            try {
              await guild.stickers.create({ file: stickerData.url, name: stickerData.name, tags: stickerData.tags, reason: 'Backup restore' });
            } catch (error) {
              await sendStatus(`Failed to restore sticker ${stickerData.name}: ${error.message}`);
            }
          }

          await sendStatus('Backup restored successfully.', new EmbedBuilder().setColor(0x57F287).setTitle('Backup restored').setTimestamp());
          setTimeout(() => statusChannel.delete().catch(() => {}), 10000);
        } catch (error) {
          console.error(error);
          await sendStatus(`Restoration failed: ${error.message}`, new EmbedBuilder().setColor(0xED4245).setTitle('Restoration failed').setTimestamp());
        }
      });

      collector.on('end', (collected) => {
        if (collected.size === 0) {
          interaction.channel.send({ content: 'Backup restoration cancelled because no confirmation was received.', ephemeral: true }).catch(() => {});
        }
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: 'The backup could not be loaded.' });
    }
  }
};
