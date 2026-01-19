const express = require('express');
const router = express.Router();
const { protectAdmin, authorizeSuperAdmin } = require('../middleware/adminAuth');
const { register, login, logout, getCurrentAdmin } = require('../controllers/adminController');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protectAdmin, getCurrentAdmin);

module.exports = router;