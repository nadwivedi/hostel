const express = require('express');
const router = express.Router();
const { protectEmployee } = require('../middleware/employeeAuth');
const { login, logout, me } = require('../controllers/employeeAuthController');

// POST /api/employees/auth/login — no auth required
router.post('/login', login);

// POST /api/employees/auth/logout — no auth required (just clears cookie)
router.post('/logout', logout);

// GET /api/employees/auth/me — requires employee token
router.get('/me', protectEmployee, me);

module.exports = router;
