const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  updateBedStatus,
  deleteRoom,
} = require('../controllers/roomController');

// All routes use protect - authorization is handled in controllers
router.get('/', protect, getAllRooms);
router.get('/:id', protect, getRoomById);
router.post('/', protect, createRoom);
router.patch('/:id', protect, updateRoom);
router.patch('/:roomId/beds/:bedId', protect, updateBedStatus);
router.delete('/:id', protect, deleteRoom);

module.exports = router;
