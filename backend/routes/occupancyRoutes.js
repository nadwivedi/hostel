const express = require('express');
const router = express.Router();
const {
  getAllOccupancies,
  getOccupancyById,
  createOccupancy,
  updateOccupancy,
  deleteOccupancy,
} = require('../controllers/occupancyController');

router.get('/', getAllOccupancies);
router.get('/:id', getOccupancyById);
router.post('/', createOccupancy);
router.patch('/:id', updateOccupancy);
router.delete('/:id', deleteOccupancy);

module.exports = router;
