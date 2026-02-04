const express = require('express');
const router = express.Router();
const employeeAuthController = require('../controllers/employeeAuthController');
const { protectEmployee } = require('../middleware/employeeAuth');

// Public routes
router.post('/login', employeeAuthController.login);
router.post('/logout', employeeAuthController.logout);

// Protected routes
router.get('/me', protectEmployee, employeeAuthController.getCurrentEmployee);
router.patch('/change-password', protectEmployee, employeeAuthController.changePassword);

module.exports = router;
