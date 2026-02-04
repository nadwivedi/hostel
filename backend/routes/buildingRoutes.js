const express = require('express');
const router = express.Router();
const {
  getBuildingsByProperty,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  bulkCreateBuildings,
} = require('../controllers/buildingController');
const { unifiedProtect } = require('../middleware/unifiedAuth');

// All routes are protected - supports User, Admin, and Employee
router.use(unifiedProtect);

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
