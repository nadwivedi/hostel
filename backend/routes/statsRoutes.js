const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getDashboardStats } = require('../controllers/statsController');

// Dashboard stats - shows user-specific stats for users, all stats for admin
router.get('/dashboard', protect, getDashboardStats);

module.exports = router;
