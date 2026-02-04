const express = require('express');
const router = express.Router();
const { unifiedProtect } = require('../middleware/unifiedAuth');
const {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertyStats,
} = require('../controllers/propertyController');

// All routes use unifiedProtect - supports User, Admin, and Employee
router.get('/', unifiedProtect, getAllProperties);
router.get('/stats', unifiedProtect, getPropertyStats);
router.get('/:id', unifiedProtect, getPropertyById);
router.post('/', unifiedProtect, createProperty);
router.patch('/:id', unifiedProtect, updateProperty);
router.delete('/:id', unifiedProtect, deleteProperty);

module.exports = router;
