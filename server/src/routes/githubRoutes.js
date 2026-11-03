const express = require('express');
const { connectRepo, linkPullRequest, getPrDetails } = require('../controllers/githubController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.post('/connect', authorize('ADMIN'), connectRepo);
router.post('/link-pr', authorize('ADMIN', 'DEVELOPER'), linkPullRequest);
router.get('/pr/:owner/:repo/:number', getPrDetails);

module.exports = router;
