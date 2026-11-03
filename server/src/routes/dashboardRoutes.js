const express = require('express');
const { getSummary, getAnalytics } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/summary', getSummary);
router.get('/analytics', getAnalytics);

module.exports = router;
