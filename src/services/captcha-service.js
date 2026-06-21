
import { AttachmentBuilder } from 'discord.js';
import { createCanvas } from '@napi-rs/canvas';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function createCaptchaText(length) {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}

function drawBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(1, '#1d4ed8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let index = 0; index < 14; index += 1) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + Math.random() * 0.15})`;
    ctx.beginPath();
    ctx.arc(randomInt(width), randomInt(height), 10 + randomInt(40), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawNoise(ctx, width, height) {
  for (let index = 0; index < 10; index += 1) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + Math.random() * 0.4})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(randomInt(width), randomInt(height));
    ctx.bezierCurveTo(
      randomInt(width),
      randomInt(height),
      randomInt(width),
      randomInt(height),
      randomInt(width),
      randomInt(height)
    );
    ctx.stroke();
  }
}

function drawText(ctx, text, width, height) {
  ctx.font = 'bold 48px Sans';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  const spacing = width / (text.length + 1);

  for (const [index, character] of [...text].entries()) {
    const x = spacing * (index + 1);
    const y = height / 2 + randomInt(14) - 7;
    const rotation = (Math.random() - 0.5) * 0.35;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.7)';
    ctx.shadowBlur = 8;
    ctx.fillText(character, 0, 0);
    ctx.restore();
  }
}

export async function createCaptcha(length) {
  const text = createCaptchaText(length);
  const width = 300;
  const height = 120;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, width, height);
  drawNoise(ctx, width, height);
  drawText(ctx, text, width, height);

  const buffer = await canvas.encode('png');
  const attachment = new AttachmentBuilder(buffer, { name: 'captcha.png' });

  return {
    answer: text,
    attachment
  };
}
