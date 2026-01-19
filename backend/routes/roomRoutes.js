const express = require('express');
const router = express.Router();
const { protectAll } = require('../middleware/authAll');
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  updateBedStatus,
  deleteRoom,
} = require('../controllers/roomController');

// All routes use protectAll - authorization is handled in controllers
router.get('/', protectAll, getAllRooms);
router.get('/:id', protectAll, getRoomById);
router.post('/', protectAll, createRoom);
router.patch('/:id', protectAll, updateRoom);
router.patch('/:roomId/beds/:bedId', protectAll, updateBedStatus);
router.delete('/:id', protectAll, deleteRoom);

module.exports = router;
