const express = require('express');
const { register, login, getMe, getUsers, updateProfile } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, getMe);
router.get('/users', authenticate, getUsers);
router.put('/profile', authenticate, updateProfile);

module.exports = router;
