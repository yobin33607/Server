export const DEFAULT_GUILD_SETTINGS = {
  enabled: true,
  verifiedRoleId: null,
  panelChannelId: null,
  logChannelId: null,
  captchaLength: 6,
  timeoutMinutes: 5,
  maxAttempts: 3
};

export const CUSTOM_IDS = {
  startVerification: 'verify:start',
  refreshCaptcha: 'verify:refresh',
  openCaptchaModal: 'verify:open-modal',
  captchaModal: 'verify:captcha-modal'
};

export const AUDIT_LIMIT = 200;
