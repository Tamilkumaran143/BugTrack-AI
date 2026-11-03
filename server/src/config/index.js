require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  JWT_SECRET: process.env.JWT_SECRET || 'bugtrack-ai-super-secret-jwt-key-2025-secure',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  NODE_ENV: process.env.NODE_ENV || 'development',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'bugtrack-webhook-secret-token',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};
