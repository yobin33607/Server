const { EmbedBuilder } = require('discord.js');

const SUPPORT_LINK = 'https://discord.gg/wZuTsF5Z2P';

function createEmbed(options = {}) {
  return new EmbedBuilder()
    .setColor(options.color || 0x5865F2)
    .setDescription(options.description || '')
    .setTimestamp()
    .setFooter({ text: 'Byte Labs Server', iconURL: options.iconURL || null });
}

function createErrorEmbed(error) {
  return createEmbed({
    color: 0xED4245,
    description: `An error occurred while processing your command.\n\`\`\`${error.message}\`\`\``
  });
}

function logError(context, error) {
  console.error(`[${new Date().toISOString()}] [ERROR] [${context}]:`, error.message);
}

module.exports = { createEmbed, createErrorEmbed, logError, SUPPORT_LINK };
