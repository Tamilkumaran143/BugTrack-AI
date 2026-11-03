require('dotenv').config();
const crypto = require('crypto');

const NODE_ENV = process.env.NODE_ENV || 'development';

function getSecret(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    if (NODE_ENV !== 'development') {
      throw new Error(`${name} must be configured outside development.`);
    }

    console.warn(`[config] ${name} is unset; using an ephemeral development-only secret.`);
    return crypto.randomBytes(48).toString('hex');
  }
  const distinctCharacters = new Set(value).size;
  const isRandomLooking = distinctCharacters >= 24
    || (/^[a-f0-9]{64,}$/i.test(value) && distinctCharacters >= 14);
  if (
    value.length < 32
    || !isRandomLooking
    || /^(replace|change|your|example|placeholder|<)/i.test(value)
  ) {
    throw new Error(`${name} must be a sufficiently diverse, non-placeholder value of at least 32 characters.`);
  }
  return value;
}

module.exports = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  JWT_SECRET: getSecret('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  NODE_ENV,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  FIX_ASSISTANT_SEND_SOURCE_TO_GEMINI: process.env.FIX_ASSISTANT_SEND_SOURCE_TO_GEMINI === 'true',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  WEBHOOK_SECRET: getSecret('WEBHOOK_SECRET'),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
