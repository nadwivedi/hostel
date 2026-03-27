const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeeController');

// All routes require owner authentication
router.get('/', protect, getEmployees);
router.post('/', protect, createEmployee);
router.patch('/:id', protect, updateEmployee);
router.delete('/:id', protect, deleteEmployee);

module.exports = router;
