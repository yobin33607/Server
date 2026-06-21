import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder
} from 'discord.js';

import { CUSTOM_IDS } from '../constants.js';

function buildBaseContainer() {
  return new ContainerBuilder();
}

function maybeThumbnail(section, iconUrl) {
  if (!iconUrl) {
    return section;
  }

  return section.setThumbnailAccessory(new ThumbnailBuilder().setURL(iconUrl));
}

export function buildPanelPayload({ guildName, iconUrl, verifiedRoleId }) {
  const container = buildBaseContainer()
    .addSectionComponents(
      maybeThumbnail(
        new SectionBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ${guildName} verification`),
          new TextDisplayBuilder().setContent(
            `Press the button below to solve a captcha and unlock <@&${verifiedRoleId}>.`
          )
        ),
        iconUrl
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        'You will receive a private challenge. Refresh is available if you want a new captcha.'
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(CUSTOM_IDS.startVerification)
          .setLabel('Start Verification')
          .setStyle(ButtonStyle.Success)
      )
    );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container]
  };
}

export function buildGuildConfigPayload({ guildName, settings, stats, iconUrl }) {
  const container = buildBaseContainer()
    .addSectionComponents(
      maybeThumbnail(
        new SectionBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ${guildName} verification config`),
          new TextDisplayBuilder().setContent(
            `Status: ${settings.enabled ? '`enabled`' : '`disabled`'}\nVerified role: ${settings.verifiedRoleId ? `<@&${settings.verifiedRoleId}>` : '`not set`'}\nPanel channel: ${settings.panelChannelId ? `<#${settings.panelChannelId}>` : '`not set`'}\nLog channel: ${settings.logChannelId ? `<#${settings.logChannelId}>` : '`not set`'}`
          )
        ),
        iconUrl
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `Captcha length: \`${settings.captchaLength}\`\nTimeout: \`${settings.timeoutMinutes} minute(s)\`\nMax attempts: \`${settings.maxAttempts}\``
      ),
      new TextDisplayBuilder().setContent(
        `Started: \`${stats.started}\`  Verified: \`${stats.verified}\`  Failed: \`${stats.failed}\`  Expired: \`${stats.expired}\`  Active: \`${stats.active}\``
      )
    );

  return {
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    components: [container]
  };
}

export function buildSetupSavedPayload({ settings, iconUrl, guildName }) {
  const container = buildBaseContainer()
    .addSectionComponents(
      maybeThumbnail(
        new SectionBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Setup saved for ${guildName}`),
          new TextDisplayBuilder().setContent(
            `Verified role: <@&${settings.verifiedRoleId}>\nPanel channel: ${settings.panelChannelId ? `<#${settings.panelChannelId}>` : '`not set`'}\nLog channel: ${settings.logChannelId ? `<#${settings.logChannelId}>` : '`not set`'}`
          )
        ),
        iconUrl
      )
    );

  return {
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    components: [container]
  };
}

export function buildSettingsSavedPayload({ settings, iconUrl, guildName }) {
  const container = buildBaseContainer()
    .addSectionComponents(
      maybeThumbnail(
        new SectionBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Updated verification settings for ${guildName}`),
          new TextDisplayBuilder().setContent(
            `Status: ${settings.enabled ? '`enabled`' : '`disabled`'}\nCaptcha length: \`${settings.captchaLength}\`\nTimeout: \`${settings.timeoutMinutes} minute(s)\`\nMax attempts: \`${settings.maxAttempts}\``
          )
        ),
        iconUrl
      )
    );

  return {
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    components: [container]
  };
}

export function buildStatsPayload({ guildName, stats, iconUrl, member, challenge }) {
  const title = member ? `# Verification status for ${member.user.tag}` : `# ${guildName} verification stats`;
  const lines = member
    ? [
        `Member: <@${member.id}>`,
        `Verified role: ${member.roles.cache.has(stats.verifiedRoleId) ? '`present`' : '`missing`'}`,
        `Pending challenge: ${challenge ? '`yes`' : '`no`'}`,
        challenge ? `Attempts used: \`${challenge.attemptCount}\`` : null,
        challenge ? `Expires: <t:${Math.floor(new Date(challenge.expiresAt).getTime() / 1000)}:F>` : null
      ].filter(Boolean)
    : [
        `Started: \`${stats.started}\``,
        `Verified: \`${stats.verified}\``,
        `Failed: \`${stats.failed}\``,
        `Expired: \`${stats.expired}\``,
        `Resets: \`${stats.resets}\``,
        `Panels sent: \`${stats.panelsSent}\``,
        `Active: \`${stats.active}\``
      ];

  const container = buildBaseContainer()
    .addSectionComponents(
      maybeThumbnail(
        new SectionBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(title),
          new TextDisplayBuilder().setContent(lines.join('\n'))
        ),
        iconUrl
      )
    );

  return {
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    components: [container]
  };
}

export function buildResetPayload({ guildName, member, removedRole }) {
  const container = buildBaseContainer().addSectionComponents(
    new SectionBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# Verification reset in ${guildName}`),
      new TextDisplayBuilder().setContent(
        `Member: <@${member.id}>\nActive challenge cleared: \`yes\`\nVerified role removed: ${removedRole ? '`yes`' : '`no`'}`
      )
    )
  );

  return {
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    components: [container]
  };
}
