const express = require('express');
const {
  structureReport,
  findDuplicates,
  suggestPriority,
  reviewChange,
  recommendDeveloper,
} = require('../controllers/aiController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.post('/structure-report', structureReport);
router.post('/find-duplicates', findDuplicates);
router.post('/suggest-priority', suggestPriority);
router.post('/review-change', reviewChange);
router.post('/recommend-developer', recommendDeveloper);

module.exports = router;
