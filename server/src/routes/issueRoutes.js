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
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Issue endpoints
router.post('/', authorize('ADMIN', 'TESTER'), createIssue);
router.get('/', getIssues);
router.get('/:id', getIssueById);
router.put('/:id', updateIssue);
router.patch('/:id/status', updateStatus);
router.patch('/:id/assign', authorize('ADMIN'), assignDeveloper);
router.delete('/:id', authorize('ADMIN'), deleteIssue);

// Comments
router.post('/:id/comments', addComment);
router.get('/:id/comments', getComments);

// Regression Verification (TESTER or ADMIN)
router.post('/:id/verification', authorize('ADMIN', 'TESTER'), createVerification);
router.get('/:id/verification', getVerifications);

module.exports = router;
