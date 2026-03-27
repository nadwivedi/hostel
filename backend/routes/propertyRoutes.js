const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertyStats,
} = require('../controllers/propertyController');

router.get('/', protect, getAllProperties);
router.get('/stats', protect, getPropertyStats);
router.get('/:id', protect, getPropertyById);
router.post('/', protect, createProperty);
router.patch('/:id', protect, updateProperty);
router.delete('/:id', protect, deleteProperty);

module.exports = router;
