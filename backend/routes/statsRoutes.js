const express = require('express');
const router = express.Router();
const { protectAll } = require('../middleware/authAll');
const { getDashboardStats } = require('../controllers/statsController');

// Dashboard stats - shows user-specific stats for users, all stats for admin
router.get('/dashboard', protectAll, getDashboardStats);

module.exports = router;
