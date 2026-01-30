const express = require('express');
const router = express.Router();
const { protectAll } = require('../middleware/authAll');
const {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertyStats,
} = require('../controllers/propertyController');

// All routes use protectAll - authorization is handled in controllers
router.get('/', protectAll, getAllProperties);
router.get('/stats', protectAll, getPropertyStats);
router.get('/:id', protectAll, getPropertyById);
router.post('/', protectAll, createProperty);
router.patch('/:id', protectAll, updateProperty);
router.delete('/:id', protectAll, deleteProperty);

module.exports = router;
