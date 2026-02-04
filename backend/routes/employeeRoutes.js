const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { protect } = require('../middleware/auth');

// All routes require user authentication (property owner)
router.use(protect);

// Employee CRUD
router.get('/', employeeController.getAllEmployees);
router.post('/', employeeController.createEmployee);
router.get('/:id', employeeController.getEmployeeById);
router.patch('/:id', employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);

// Permission and property management
router.patch('/:id/permissions', employeeController.updatePermissions);
router.patch('/:id/properties', employeeController.assignProperties);

module.exports = router;
