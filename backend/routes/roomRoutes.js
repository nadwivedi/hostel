const express = require('express');
const router = express.Router();
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  updateBedStatus,
  deleteRoom,
} = require('../controllers/roomController');

router.get('/', getAllRooms);
router.get('/:id', getRoomById);
router.post('/', createRoom);
router.patch('/:id', updateRoom);
router.patch('/:roomId/beds/:bedId', updateBedStatus);
router.delete('/:id', deleteRoom);

module.exports = router;
