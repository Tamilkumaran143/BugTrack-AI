const express = require('express');
const {
  structureReport,
  findDuplicates,
  suggestPriority,
  reviewChange,
  recommendDeveloper,
  analyzeFixAssistant,
  analyzeRepository,
  generateFixSuggestion,
  validateFix,
  applyFix,
  rollbackFix,
  getFixHistory,
} = require('../controllers/aiController');
const {
  authenticate,
  authorize,
  requireProjectMember,
  requireIssueProjectMember,
  requireIssueProjectMemberFromBody,
} = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.post('/structure-report', structureReport);
router.post('/find-duplicates', requireProjectMember(), findDuplicates);
router.post('/suggest-priority', suggestPriority);
router.post('/review-change', reviewChange);
router.post('/recommend-developer', requireProjectMember(), recommendDeveloper);

router.post('/fix-assistant/analyze', authorize('DEVELOPER', 'ADMIN'), requireIssueProjectMemberFromBody({ required: false }), analyzeFixAssistant);
router.post('/fix-assistant/repository-analysis', authorize('DEVELOPER', 'ADMIN'), analyzeRepository);
router.post('/fix-assistant/generate-fix', authorize('DEVELOPER', 'ADMIN'), requireIssueProjectMemberFromBody({ required: false }), generateFixSuggestion);
router.post('/fix-assistant/validate', authorize('DEVELOPER', 'ADMIN'), requireIssueProjectMemberFromBody({ required: false }), validateFix);
router.post('/fix-assistant/apply', authorize('DEVELOPER', 'ADMIN'), requireIssueProjectMemberFromBody(), applyFix);
router.post('/fix-assistant/rollback', authorize('DEVELOPER', 'ADMIN'), requireIssueProjectMemberFromBody(), rollbackFix);
router.get('/fix-assistant/history/:id', requireIssueProjectMember(), getFixHistory);
router.post('/fix-assistant', authorize('DEVELOPER', 'ADMIN'), requireIssueProjectMemberFromBody({ required: false }), analyzeFixAssistant);

module.exports = router;
