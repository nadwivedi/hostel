const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/employeeAuth');
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
router.post('/', protect, checkPermission('rooms', 'add'), createRoom);
router.patch('/:id', protect, checkPermission('rooms', 'edit'), updateRoom);
router.patch('/:roomId/beds/:bedId', protect, checkPermission('rooms', 'edit'), updateBedStatus);
router.delete('/:id', protect, checkPermission('rooms', 'delete'), deleteRoom);

module.exports = router;
