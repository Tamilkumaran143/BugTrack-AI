const crypto = require('crypto');
const config = require('../config');
const prisma = require('../config/db');
const geminiService = require('../services/geminiService');

function verifyGithubSignature(secret, payload, signatureHeader) {
  if (
    typeof secret !== 'string'
    || !secret
    || !Buffer.isBuffer(payload)
    || typeof signatureHeader !== 'string'
    || !/^sha256=[a-f0-9]{64}$/i.test(signatureHeader)
  ) return false;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from(`sha256=${hmac.update(payload).digest('hex')}`);
  const provided = Buffer.from(signatureHeader);
  return digest.length === provided.length && crypto.timingSafeEqual(digest, provided);
}

async function handleGithubWebhook(req, res, next) {
  try {
    const event = req.headers['x-github-event'] || 'unknown';
    const signature = req.headers['x-hub-signature-256'];

    if (!config.WEBHOOK_SECRET) {
      return res.status(503).json({ success: false, message: 'GitHub webhook verification is not configured.' });
    }
    if (!verifyGithubSignature(config.WEBHOOK_SECRET, req.rawBody, signature)) {
      return res.status(401).json({ success: false, message: 'Invalid or missing webhook signature.' });
    }

    const payload = req.body;

    if (event === 'ping') {
      return res.json({ success: true, message: 'Pong! Webhook active and verified.' });
    }

    if (event === 'pull_request') {
      const action = payload.action;
      const pr = payload.pull_request;

      if (pr) {
        const existingPr = await prisma.pullRequest.findFirst({
          where: {
            repository: payload.repository?.full_name || '',
            prNumber: pr.number,
          },
          include: { issue: true },
        });

        if (existingPr) {
          await prisma.$transaction(async (tx) => {
            await tx.pullRequest.update({
              where: { id: existingPr.id },
              data: { state: pr.state, title: pr.title },
            });

            if (action === 'closed' && pr.merged) {
              const issue = await tx.issue.findUnique({ where: { id: existingPr.issueId } });
              if (issue?.status === 'IN_PROGRESS') {
                await tx.issue.update({
                  where: { id: issue.id },
                  data: { status: 'READY_FOR_TESTING' },
                });
                await tx.activity.create({
                  data: {
                    issueId: issue.id,
                    action: 'STATUS_CHANGE',
                    oldValue: issue.status,
                    newValue: 'READY_FOR_TESTING',
                  },
                });
              }
            }
          });
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
