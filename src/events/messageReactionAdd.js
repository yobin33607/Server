const { logError } = require('../utils');

module.exports = {
  name: 'messageReactionAdd',

  async execute(reaction, user) {
    try {
      if (user.bot) return;
      if (!reaction.message.guild) return;

      const fullReaction = reaction.partial ? await reaction.fetch().catch(() => null) : reaction;
      if (!fullReaction) return;

      const emojiKey = fullReaction.emoji.id
        ? `${fullReaction.emoji.name}:${fullReaction.emoji.id}`
        : fullReaction.emoji.name;

      const rule = fullReaction.client.reactionRoles.getRule(
        fullReaction.message.guild.id,
        fullReaction.message.channel.id,
        fullReaction.message.id,
        emojiKey
      );

      if (!rule) return;

      const member = await fullReaction.message.guild.members.fetch(user.id).catch(() => null);
      if (!member) return;

      const role = await fullReaction.message.guild.roles.fetch(rule.role_id).catch(() => null);
      if (!role) return;

      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role).catch(() => {});
      }
    } catch (error) {
      logError('messageReactionAdd', error);
    }
  }
};
