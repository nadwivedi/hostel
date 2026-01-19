const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { protectAdmin } = require('../middleware/adminAuth');
const {
  getAllOccupancies,
  getOccupancyById,
  createOccupancy,
  updateOccupancy,
  deleteOccupancy,
} = require('../controllers/occupancyController');

router.get('/', protect, getAllOccupancies);
router.get('/:id', protect, getOccupancyById);
router.post('/', protectAdmin, createOccupancy);
router.patch('/:id', protectAdmin, updateOccupancy);
router.delete('/:id', protectAdmin, deleteOccupancy);

module.exports = router;
