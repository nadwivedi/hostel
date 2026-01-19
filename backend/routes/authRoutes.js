const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { register, login, logout, getCurrentUser } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getCurrentUser);

module.exports = router;