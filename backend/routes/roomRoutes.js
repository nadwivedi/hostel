const express = require('express');
const router = express.Router();
const { unifiedProtect } = require('../middleware/unifiedAuth');
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  updateBedStatus,
  deleteRoom,
} = require('../controllers/roomController');

// All routes use unifiedProtect - supports User, Admin, and Employee
router.get('/', unifiedProtect, getAllRooms);
router.get('/:id', unifiedProtect, getRoomById);
router.post('/', unifiedProtect, createRoom);
router.patch('/:id', unifiedProtect, updateRoom);
router.patch('/:roomId/beds/:bedId', unifiedProtect, updateBedStatus);
router.delete('/:id', unifiedProtect, deleteRoom);

module.exports = router;
