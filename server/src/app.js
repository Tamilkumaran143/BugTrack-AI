const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const config = require('./config');
const prisma = require('./config/db');
const geminiService = require('./services/geminiService');

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const issueRoutes = require('./routes/issueRoutes');
const aiRoutes = require('./routes/aiRoutes');
const githubRoutes = require('./routes/githubRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();

// CORS setup
const allowedOrigins = config.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    if (config.NODE_ENV !== 'production' && origin) {
      try {
        const parsedOrigin = new URL(origin);
        if (['localhost', '127.0.0.1'].includes(parsedOrigin.hostname)) return callback(null, true);
      } catch {
        return callback(new Error('Origin is not allowed by CORS configuration.'));
      }
    }
    return callback(new Error('Origin is not allowed by CORS configuration.'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-hub-signature-256', 'x-github-event'],
}));

// Body parsing
app.use(express.json({
  limit: '10mb',
  verify(req, res, buffer) {
    req.rawBody = Buffer.from(buffer);
  },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// General Rate Limiting
app.use('/api/', apiLimiter);

// Health check
app.get('/api/health', async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const geminiConfigured = geminiService.isConfigured();
    return res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'BugTrack AI Backend',
      version: '1.0.0',
      database: 'connected',
      fallbackEngine: 'active',
      geminiConfigured,
      fixAssistantSourceSharingEnabled: config.FIX_ASSISTANT_SEND_SOURCE_TO_GEMINI,
    });
  } catch (error) {
    return next(error);
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/webhooks', webhookRoutes);

// Catch 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
