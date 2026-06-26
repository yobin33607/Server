const { ChannelType } = require('discord.js');
const { logError } = require('../utils');
const { users } = require('../database');

module.exports = {
  name: 'messageCreate',

  async execute(message) {
    try {
      if (message.author.bot) return;

      const client = message.client;
      const modmailDb = client.modmail;

      if (message.guild) {
        users.upsert(message.author.id, message.author.username);

        if (!modmailDb) return;

        const thread = modmailDb.getThreadByChannel(message.channelId);
        if (thread && thread.status === 'open') {
          const user = await client.users.fetch(thread.user_id).catch(() => null);
          if (user) {
            await user.send({
              embeds: [
                {
                  title: `Reply from ${message.guild.name} staff`,
                  description: message.content || '*No text content*',
                  color: 0x57F287,
                  timestamp: new Date().toISOString(),
                  footer: { text: `Thread ID: ${thread.thread_channel_id}` }
                }
              ]
            }).catch(() => null);
          }
        }

        return;
      }

      if (!modmailDb) return;

      const configs = modmailDb.getAllEnabled();
      for (const config of configs) {
        const guild = await client.guilds.fetch(config.guild_id).catch(() => null);
        if (!guild) continue;
        if (!config.support_channel_id) continue;

        const existingThread = modmailDb.getThreadByUser(config.guild_id, message.author.id);
        if (existingThread) {
          const threadChannel = await guild.channels.fetch(existingThread.thread_channel_id).catch(() => null);
          if (threadChannel) {
            await threadChannel.send({
              content: message.content || undefined,
              embeds: [
                {
                  title: `Message from ${message.author.tag}`,
                  description: message.content ? undefined : '*No text content*',
                  color: 0x5865F2,
                  timestamp: new Date().toISOString(),
                  footer: { text: `User ID: ${message.author.id}` }
                }
              ],
              files: message.attachments.map((attachment) => attachment.url)
            }).catch(() => null);
          }
          return;
        }

        const supportChannel = await guild.channels.fetch(config.support_channel_id).catch(() => null);
        if (!supportChannel || supportChannel.type !== ChannelType.GuildText) continue;

        const thread = await guild.channels.create({
          name: `modmail-${message.author.username}`.slice(0, 90),
          type: ChannelType.GuildText,
          parent: config.category_id || undefined,
          topic: `Modmail thread for ${message.author.tag} (${message.author.id})`
        }).catch(() => null);
        if (!thread) continue;

        modmailDb.addThread(config.guild_id, message.author.id, thread.id);

        await thread.send({
          content: `New modmail thread opened by <@${message.author.id}>.`,
          embeds: [
            {
              title: `Message from ${message.author.tag}`,
              description: message.content || '*No text content*',
              color: 0x57F287,
              timestamp: new Date().toISOString(),
              footer: { text: `User ID: ${message.author.id}` }
            }
          ],
          files: message.attachments.map((attachment) => attachment.url)
        }).catch(() => null);

        if (config.log_channel_id) {
          const logChannel = await guild.channels.fetch(config.log_channel_id).catch(() => null);
          if (logChannel && logChannel.type === ChannelType.GuildText) {
            await logChannel.send({
              content: `New modmail thread opened for <@${message.author.id}> in ${thread}.`,
              embeds: [
                {
                  title: 'Modmail Opened',
                  fields: [
                    { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
                    { name: 'Thread', value: `${thread}`, inline: true }
                  ],
                  color: 0x57F287,
                  timestamp: new Date().toISOString()
                }
              ]
            }).catch(() => null);
          }
        }

        return;
      }
    } catch (error) {
      logError('messageCreate', error);
    }
  }
};
