const express = require('express');
const router = express.Router();
const { protectAll } = require('../middleware/authAll');
const {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  getLocationStats,
} = require('../controllers/locationController');

// All routes use protectAll - authorization is handled in controllers
router.get('/', protectAll, getAllLocations);
router.get('/stats', protectAll, getLocationStats);
router.get('/:id', protectAll, getLocationById);
router.post('/', protectAll, createLocation);
router.patch('/:id', protectAll, updateLocation);

module.exports = router;
