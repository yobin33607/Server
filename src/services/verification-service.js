
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  PermissionsBitField,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';

import { CUSTOM_IDS } from '../constants.js';
import { createCaptcha } from './captcha-service.js';
import { buildPanelPayload } from '../ui/messages.js';
import { createUserScopedId, parseUserScopedId } from '../utils/custom-id.js';

function normalizeCaptchaAnswer(value) {
  return value.trim().toUpperCase();
}

function createClosedCaptchaEmbed({ title, lines }) {
  return new EmbedBuilder().setTitle(title).setDescription(lines.join('\n'));
}

export class VerificationService {
  constructor(database) {
    this.database = database;
  }

  async sendPanel(channel, guild) {
    const guildConfig = await this.database.getGuild(guild.id);

    if (!guildConfig.settings.verifiedRoleId) {
      throw new Error('Verified role is not configured yet.');
    }

    return channel.send(
      buildPanelPayload({
        guildName: guild.name,
        iconUrl: guild.iconURL(),
        verifiedRoleId: guildConfig.settings.verifiedRoleId
      })
    );
  }

  async handleButton(interaction) {
    const { base, userId } = parseUserScopedId(interaction.customId);

    if (userId && interaction.user.id !== userId) {
      await interaction.reply({
        content: 'This verification action belongs to someone else.',
        ephemeral: true
      });
      return;
    }

    if (interaction.customId === CUSTOM_IDS.startVerification) {
      await this.start(interaction);
      return;
    }

    if (base === CUSTOM_IDS.refreshCaptcha) {
      await this.refresh(interaction);
      return;
    }

    if (base === CUSTOM_IDS.openCaptchaModal) {
      await this.openModal(interaction);
    }
  }

  async handleModal(interaction) {
    const { base, userId } = parseUserScopedId(interaction.customId);

    if (base !== CUSTOM_IDS.captchaModal) {
      return;
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        content: 'This captcha session belongs to someone else.',
        ephemeral: true
      });
      return;
    }

    const guildConfig = await this.database.getGuild(interaction.guildId);
    const challenge = await this.database.getChallenge(interaction.guildId, interaction.user.id);

    if (!challenge) {
      await interaction.reply({
        content: 'No active captcha was found. Press the verification button to start again.',
        ephemeral: true
      });
      return;
    }

    if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
      await this.database.expireChallenge(interaction.guildId, interaction.user.id);
      await interaction.reply({
        content: 'This captcha expired. Press the verification button to generate a new one.',
        ephemeral: true
      });
      return;
    }

    const submitted = normalizeCaptchaAnswer(interaction.fields.getTextInputValue('captcha_answer'));
    if (submitted !== challenge.answer) {
      const result = await this.database.recordFailedAttempt(interaction.guildId, interaction.user.id);

      if (!result) {
        await interaction.reply({
          content: 'That captcha is no longer active. Start again from the verification panel.',
          ephemeral: true
        });
        return;
      }

      if (result.exhausted) {
        await this.database.addAuditEntry({
          guildId: interaction.guildId,
          action: 'verification_failed',
          actorId: interaction.user.id,
          targetId: interaction.user.id
        });

        await this.log(interaction.guild, {
          title: 'Verification failed',
          lines: [`Member: <@${interaction.user.id}>`, 'Reason: max attempts reached']
        });

        await this.#closeCaptchaMessage(interaction, {
          title: 'Verification Failed',
          lines: [
            'You used all available captcha attempts.',
            'Press the verification button again to start a new challenge.'
          ]
        });

        await interaction.reply({
          content: 'You used every allowed attempt. Press the verification button to get a new captcha.',
          ephemeral: true
        });
        return;
      }

      const attemptsLeft = guildConfig.settings.maxAttempts - result.challenge.attemptCount;
      await interaction.reply({
        content: `Incorrect captcha. You have **${attemptsLeft}** attempt(s) left.`,
        ephemeral: true
      });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const validation = this.#validateRoleAssignment(interaction.guild, guildConfig.settings.verifiedRoleId);

    if (validation) {
      await interaction.reply({
        content: validation,
        ephemeral: true
      });
      return;
    }

    if (!member.roles.cache.has(guildConfig.settings.verifiedRoleId)) {
      await member.roles.add(guildConfig.settings.verifiedRoleId);
    }

    await this.database.completeChallenge(interaction.guildId, interaction.user.id);
    await this.database.addAuditEntry({
      guildId: interaction.guildId,
      action: 'verification_completed',
      actorId: interaction.user.id,
      targetId: interaction.user.id
    });

    await this.log(interaction.guild, {
      title: 'Verification completed',
      lines: [
        `Member: <@${interaction.user.id}>`,
        `Role granted: <@&${guildConfig.settings.verifiedRoleId}>`
      ]
    });

    await this.#closeCaptchaMessage(interaction, {
      title: 'Verification Completed',
      lines: [
        `You have been verified successfully.`,
        `Granted role: <@&${guildConfig.settings.verifiedRoleId}>`
      ]
    });

    await interaction.reply({
      content: `Verification complete. You now have <@&${guildConfig.settings.verifiedRoleId}>.`,
      ephemeral: true
    });
  }

  async start(interaction) {
    const guildConfig = await this.database.getGuild(interaction.guildId);

    if (!guildConfig.settings.enabled) {
      await interaction.reply({
        content: 'Verification is currently disabled.',
        ephemeral: true
      });
      return;
    }

    if (!guildConfig.settings.verifiedRoleId) {
      await interaction.reply({
        content: 'This server has not configured a verified role yet.',
        ephemeral: true
      });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (member.roles.cache.has(guildConfig.settings.verifiedRoleId)) {
      await interaction.reply({
        content: `You already have <@&${guildConfig.settings.verifiedRoleId}>.`,
        ephemeral: true
      });
      return;
    }

    await this.#sendCaptchaMessage(interaction, guildConfig.settings, false);
  }

  async refresh(interaction) {
    const guildConfig = await this.database.getGuild(interaction.guildId);
    await this.#sendCaptchaMessage(interaction, guildConfig.settings, true);
  }

  async openModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId(createUserScopedId(CUSTOM_IDS.captchaModal, interaction.user.id))
      .setTitle('Enter Captcha')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('captcha_answer')
            .setLabel('Captcha answer')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(4)
            .setMaxLength(8)
        )
      );

    await interaction.showModal(modal);
  }

  async log(guild, { title, lines }) {
    const guildConfig = await this.database.getGuild(guild.id);
    if (!guildConfig.settings.logChannelId) {
      return;
    }

    const channel = await guild.channels.fetch(guildConfig.settings.logChannelId).catch(() => null);
    if (!channel?.isTextBased()) {
      return;
    }

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(title)
          .setDescription(lines.join('\n'))
          .setTimestamp()
      ]
    });
  }

  async cleanupExpiredChallenges(client) {
    const expired = await this.database.expireStaleChallenges();

    for (const challenge of expired) {
      const guild = await client.guilds.fetch(challenge.guildId).catch(() => null);
      if (!guild) {
        continue;
      }

      await this.log(guild, {
        title: 'Verification expired',
        lines: [`Member: <@${challenge.userId}>`, 'Reason: challenge timeout reached']
      });
    }
  }

  async #sendCaptchaMessage(interaction, settings, updateExisting) {
    const captcha = await createCaptcha(settings.captchaLength);
    const expiresAt = new Date(Date.now() + settings.timeoutMinutes * 60_000).toISOString();

    await this.database.upsertChallenge(interaction.guildId, interaction.user.id, {
      answer: captcha.answer,
      expiresAt
    });

    const embed = new EmbedBuilder()
      .setTitle('Captcha Verification')
      .setDescription(
        [
          'Read the captcha image and submit the exact characters.',
          `Attempts allowed: **${settings.maxAttempts}**`,
          `Expires: <t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:R>`
        ].join('\n')
      )
      .setImage('attachment://captcha.png');

    const payload = {
      embeds: [embed],
      files: [captcha.attachment],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(createUserScopedId(CUSTOM_IDS.openCaptchaModal, interaction.user.id))
            .setLabel('Enter Captcha')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(createUserScopedId(CUSTOM_IDS.refreshCaptcha, interaction.user.id))
            .setLabel('Refresh Captcha')
            .setStyle(ButtonStyle.Secondary)
        )
      ],
      ephemeral: true
    };

    if (updateExisting) {
      delete payload.ephemeral;
      await interaction.update(payload);
      return;
    }

    await interaction.reply(payload);
  }

  #validateRoleAssignment(guild, roleId) {
    const me = guild.members.me;
    const role = guild.roles.cache.get(roleId);

    if (!me?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return 'I need the Manage Roles permission before I can finish verification.';
    }

    if (!role) {
      return 'The configured verified role no longer exists. Ask an admin to run /verify setup again.';
    }

    if (role.managed) {
      return 'The configured verified role is managed by an integration and cannot be assigned manually.';
    }

    if (me.roles.highest.comparePositionTo(role) <= 0) {
      return 'My role must be above the verified role to assign it.';
    }

    return null;
  }

  async #closeCaptchaMessage(interaction, state) {
    if (!interaction.message) {
      return;
    }

    await interaction.message
      .edit({
        embeds: [
          createClosedCaptchaEmbed({
            title: state.title,
            lines: state.lines
          })
        ],
        components: [],
        files: []
      })
      .catch(() => null);
  }
}
