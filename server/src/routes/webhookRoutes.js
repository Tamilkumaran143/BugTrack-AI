const express = require('express');
const { handleGithubWebhook } = require('../controllers/webhookController');

const router = express.Router();

router.post('/github', handleGithubWebhook);

module.exports = router;
