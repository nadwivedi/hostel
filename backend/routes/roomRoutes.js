const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { protectAdmin } = require('../middleware/adminAuth');
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  updateBedStatus,
  deleteRoom,
} = require('../controllers/roomController');

router.get('/', protect, getAllRooms);
router.get('/:id', protect, getRoomById);
router.post('/', protectAdmin, createRoom);
router.patch('/:id', protectAdmin, updateRoom);
router.patch('/:roomId/beds/:bedId', protectAdmin, updateBedStatus);
router.delete('/:id', protectAdmin, deleteRoom);

module.exports = router;
