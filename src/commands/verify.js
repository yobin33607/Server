
import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

import {
  buildGuildConfigPayload,
  buildResetPayload,
  buildSettingsSavedPayload,
  buildSetupSavedPayload,
  buildStatsPayload
} from '../ui/messages.js';

const data = new SlashCommandBuilder()
  .setName('verify')
  .setDescription('Manage server verification.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName('setup')
      .setDescription('Save the verified role and channels.')
      .addRoleOption((option) =>
        option.setName('role').setDescription('Role granted after verification.').setRequired(true)
      )
      .addChannelOption((option) =>
        option
          .setName('channel')
          .setDescription('Channel used for the verification panel.')
          .addChannelTypes(ChannelType.GuildText)
      )
      .addChannelOption((option) =>
        option
          .setName('log-channel')
          .setDescription('Optional log channel for verification events.')
          .addChannelTypes(ChannelType.GuildText)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('settings')
      .setDescription('Update verification behavior.')
      .addIntegerOption((option) =>
        option
          .setName('captcha-length')
          .setDescription('Captcha length between 4 and 8.')
          .setMinValue(4)
          .setMaxValue(8)
      )
      .addIntegerOption((option) =>
        option
          .setName('timeout-minutes')
          .setDescription('Challenge timeout between 1 and 30 minutes.')
          .setMinValue(1)
          .setMaxValue(30)
      )
      .addIntegerOption((option) =>
        option
          .setName('max-attempts')
          .setDescription('Maximum attempts between 1 and 10.')
          .setMinValue(1)
          .setMaxValue(10)
      )
      .addBooleanOption((option) =>
        option.setName('enabled').setDescription('Enable or disable verification.')
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('panel')
      .setDescription('Send the verification panel.')
      .addChannelOption((option) =>
        option
          .setName('channel')
          .setDescription('Target channel for the panel.')
          .addChannelTypes(ChannelType.GuildText)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('config').setDescription('Show the current verification configuration.')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('stats')
      .setDescription('Show verification stats.')
      .addUserOption((option) => option.setName('member').setDescription('Member to inspect.'))
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('reset')
      .setDescription('Reset a member verification state.')
      .addUserOption((option) =>
        option.setName('member').setDescription('Member to reset.').setRequired(true)
      )
      .addBooleanOption((option) =>
        option
          .setName('remove-role')
          .setDescription('Remove the verified role if the member already has it.')
      )
  );

async function handleSetup(interaction, services) {
  const role = interaction.options.getRole('role', true);
  const channel = interaction.options.getChannel('channel');
  const logChannel = interaction.options.getChannel('log-channel');

  const guild = await services.database.updateGuildSettings(interaction.guildId, {
    verifiedRoleId: role.id,
    panelChannelId: channel?.id ?? null,
    logChannelId: logChannel?.id ?? null,
    enabled: true
  });

  await services.database.addAuditEntry({
    guildId: interaction.guildId,
    action: 'setup_saved',
    actorId: interaction.user.id,
    targetId: role.id
  });

  await interaction.reply(
    buildSetupSavedPayload({
      settings: guild.settings,
      iconUrl: interaction.guild.iconURL(),
      guildName: interaction.guild.name
    })
  );
}

async function handleSettings(interaction, services) {
  const patch = {};

  for (const [option, key] of [
    ['captcha-length', 'captchaLength'],
    ['timeout-minutes', 'timeoutMinutes'],
    ['max-attempts', 'maxAttempts'],
    ['enabled', 'enabled']
  ]) {
    const value =
      option === 'enabled'
        ? interaction.options.getBoolean(option)
        : interaction.options.getInteger(option);

    if (value !== null) {
      patch[key] = value;
    }
  }

  const guild = await services.database.updateGuildSettings(interaction.guildId, patch);

  await services.database.addAuditEntry({
    guildId: interaction.guildId,
    action: 'settings_updated',
    actorId: interaction.user.id
  });

  await interaction.reply(
    buildSettingsSavedPayload({
      settings: guild.settings,
      iconUrl: interaction.guild.iconURL(),
      guildName: interaction.guild.name
    })
  );
}

async function handlePanel(interaction, services) {
  const savedGuild = await services.database.getGuild(interaction.guildId);
  const targetChannel =
    interaction.options.getChannel('channel') ??
    (savedGuild.settings.panelChannelId
      ? await interaction.guild.channels.fetch(savedGuild.settings.panelChannelId).catch(() => null)
      : null) ??
    interaction.channel;

  const panelMessage = await services.verification.sendPanel(targetChannel, interaction.guild);

  await services.database.updateGuildSettings(interaction.guildId, {
    panelChannelId: targetChannel.id
  });
  await services.database.incrementPanelsSent(interaction.guildId);
  await services.database.addAuditEntry({
    guildId: interaction.guildId,
    action: 'panel_sent',
    actorId: interaction.user.id,
    targetId: targetChannel.id,
    metadata: {
      messageId: panelMessage.id
    }
  });

  await interaction.reply({
    content: `Verification panel sent to ${targetChannel}.`,
    ephemeral: true
  });
}

async function handleConfig(interaction, services) {
  const guild = await services.database.getGuild(interaction.guildId);
  const stats = await services.database.getGuildStats(interaction.guildId);

  await interaction.reply(
    buildGuildConfigPayload({
      guildName: interaction.guild.name,
      settings: guild.settings,
      stats,
      iconUrl: interaction.guild.iconURL()
    })
  );
}

async function handleStats(interaction, services) {
  const memberUser = interaction.options.getUser('member');
  const guild = await services.database.getGuild(interaction.guildId);
  const stats = await services.database.getGuildStats(interaction.guildId);

  if (!memberUser) {
    await interaction.reply(
      buildStatsPayload({
        guildName: interaction.guild.name,
        stats,
        iconUrl: interaction.guild.iconURL()
      })
    );
    return;
  }

  const member = await interaction.guild.members.fetch(memberUser.id);
  const challenge = await services.database.getChallenge(interaction.guildId, memberUser.id);

  await interaction.reply(
    buildStatsPayload({
      guildName: interaction.guild.name,
      stats: {
        ...stats,
        verifiedRoleId: guild.settings.verifiedRoleId
      },
      iconUrl: interaction.guild.iconURL(),
      member,
      challenge
    })
  );
}

async function handleReset(interaction, services) {
  const user = interaction.options.getUser('member', true);
  const removeRole = interaction.options.getBoolean('remove-role') ?? false;
  const guildConfig = await services.database.getGuild(interaction.guildId);
  const member = await interaction.guild.members.fetch(user.id);

  await services.database.resetMember(interaction.guildId, user.id);

  let removedRole = false;
  if (removeRole && guildConfig.settings.verifiedRoleId && member.roles.cache.has(guildConfig.settings.verifiedRoleId)) {
    await member.roles.remove(guildConfig.settings.verifiedRoleId);
    removedRole = true;
  }

  await services.database.addAuditEntry({
    guildId: interaction.guildId,
    action: 'member_reset',
    actorId: interaction.user.id,
    targetId: user.id,
    metadata: {
      removedRole
    }
  });

  await services.verification.log(interaction.guild, {
    title: 'Verification reset',
    lines: [
      `Member: <@${user.id}>`,
      `Moderator: <@${interaction.user.id}>`,
      `Verified role removed: ${removedRole ? 'yes' : 'no'}`
    ]
  });

  await interaction.reply(
    buildResetPayload({
      guildName: interaction.guild.name,
      member,
      removedRole
    })
  );
}

export default {
  data,
  async execute(interaction, services) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      await handleSetup(interaction, services);
      return;
    }

    if (subcommand === 'settings') {
      await handleSettings(interaction, services);
      return;
    }

    if (subcommand === 'panel') {
      await handlePanel(interaction, services);
      return;
    }

    if (subcommand === 'config') {
      await handleConfig(interaction, services);
      return;
    }

    if (subcommand === 'stats') {
      await handleStats(interaction, services);
      return;
    }

    if (subcommand === 'reset') {
      await handleReset(interaction, services);
    }
  }
};
