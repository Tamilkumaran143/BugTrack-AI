const app = require('./app');
const config = require('./config');
const prisma = require('./config/db');

const PORT = config.PORT;

async function startServer() {
  try {
    if (
      config.NODE_ENV === 'production'
      && (!config.JWT_SECRET || !config.WEBHOOK_SECRET || config.CORS_ORIGIN === '*')
    ) {
      throw new Error('JWT_SECRET, WEBHOOK_SECRET, and a restricted CORS_ORIGIN must be configured in production.');
    }

    // Verify database connection
    await prisma.$connect();
    console.log('✅ SQLite Database connected successfully via Prisma');

    const server = app.listen(PORT, () => {
      console.log(`
=====================================================
🚀 BUGTRACK AI SERVER RUNNING
📡 Local URL:    http://localhost:${PORT}
🧪 Health check: http://localhost:${PORT}/api/health
🤖 AI Engine:    ${config.GEMINI_API_KEY ? 'Google Gemini API' : 'Local Deterministic Fallback Engine'}
🛡️  Environment:  ${config.NODE_ENV}
=====================================================
      `);
    });

    const shutdown = async () => {
      console.log('\nShutting down server gracefully...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Prisma disconnected. Server terminated.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
