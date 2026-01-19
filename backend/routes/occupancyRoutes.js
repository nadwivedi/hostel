const express = require('express');
const router = express.Router();
const { protectAll } = require('../middleware/authAll');
const {
  getAllOccupancies,
  getOccupancyById,
  createOccupancy,
  updateOccupancy,
  deleteOccupancy,
} = require('../controllers/occupancyController');

// All routes use protectAll - authorization is handled in controllers
router.get('/', protectAll, getAllOccupancies);
router.get('/:id', protectAll, getOccupancyById);
router.post('/', protectAll, createOccupancy);
router.patch('/:id', protectAll, updateOccupancy);
router.delete('/:id', protectAll, deleteOccupancy);

module.exports = router;
