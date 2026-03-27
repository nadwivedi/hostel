const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getBuildingsByProperty,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  bulkCreateBuildings,
} = require('../controllers/buildingController');
router.use(protect);

// Get buildings by property
router.get('/property/:propertyId', getBuildingsByProperty);

// Bulk create buildings
router.post('/bulk', bulkCreateBuildings);

// CRUD routes
router.route('/')
  .post(createBuilding);

router.route('/:id')
  .get(getBuildingById)
  .patch(updateBuilding)
  .delete(deleteBuilding);

module.exports = router;
