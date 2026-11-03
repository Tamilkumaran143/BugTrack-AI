const express = require('express');
const {
  createIssue,
  getIssues,
  getIssueById,
  updateIssue,
  updateStatus,
  assignDeveloper,
  deleteIssue,
} = require('../controllers/issueController');
const { addComment, getComments } = require('../controllers/commentController');
const { createVerification, getVerifications } = require('../controllers/verificationController');
const { authenticate, authorize, requireProjectMember, requireIssueProjectMember } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Issue endpoints
router.post('/', authorize('ADMIN', 'TESTER'), requireProjectMember(), createIssue);
router.get('/', getIssues);
router.get('/:id', requireIssueProjectMember(), getIssueById);
router.put('/:id', authorize('ADMIN', 'TESTER'), requireIssueProjectMember(), updateIssue);
router.patch('/:id/status', requireIssueProjectMember(), updateStatus);
router.patch('/:id/assign', authorize('ADMIN'), requireIssueProjectMember(), assignDeveloper);
router.delete('/:id', authorize('ADMIN'), requireIssueProjectMember(), deleteIssue);

// Comments
router.post('/:id/comments', requireIssueProjectMember(), addComment);
router.get('/:id/comments', requireIssueProjectMember(), getComments);

// Regression Verification (TESTER or ADMIN)
router.post('/:id/verification', authorize('ADMIN', 'TESTER'), requireIssueProjectMember(), createVerification);
router.get('/:id/verification', requireIssueProjectMember(), getVerifications);

module.exports = router;
