const crypto = require('crypto');
const config = require('../config');
const prisma = require('../config/db');
const geminiService = require('../services/geminiService');

function verifyGithubSignature(secret, payload, signatureHeader) {
  if (!signatureHeader) return false;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signatureHeader));
}

async function handleGithubWebhook(req, res, next) {
  try {
    const event = req.headers['x-github-event'] || 'unknown';
    const signature = req.headers['x-hub-signature-256'];

    // Verify webhook signature if secret configured and header provided
    if (config.WEBHOOK_SECRET && signature) {
      const isValid = verifyGithubSignature(
        config.WEBHOOK_SECRET,
        JSON.stringify(req.body),
        signature
      );
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
      }
    }

    const payload = req.body;

    if (event === 'ping') {
      return res.json({ success: true, message: 'Pong! Webhook active and verified.' });
    }

    if (event === 'pull_request') {
      const action = payload.action;
      const pr = payload.pull_request;

      if (pr) {
        // Look for existing PR linked in database
        const existingPr = await prisma.pullRequest.findFirst({
          where: {
            repository: payload.repository?.full_name || '',
            prNumber: pr.number,
          },
          include: { issue: true },
        });

        if (existingPr) {
          await prisma.pullRequest.update({
            where: { id: existingPr.id },
            data: {
              state: pr.state,
              title: pr.title,
            },
          });

          // If PR was closed / merged
          if (action === 'closed' && pr.merged) {
            await prisma.activity.create({
              data: {
                issueId: existingPr.issueId,
                action: 'STATUS_CHANGE',
                oldValue: existingPr.issue.status,
                newValue: 'READY_FOR_TESTING',
              },
            });

            await prisma.issue.update({
              where: { id: existingPr.issueId },
              data: { status: 'READY_FOR_TESTING' },
            });
          }
        }
      }
    }

    return res.json({
      success: true,
      receivedEvent: event,
      message: 'GitHub webhook processed successfully.',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleGithubWebhook,
};
