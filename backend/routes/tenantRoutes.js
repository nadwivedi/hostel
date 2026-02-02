const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
} = require('../controllers/tenantController');

// All routes use protect - authorization is handled in controllers
router.get('/', protect, getAllTenants);
router.get('/:id', protect, getTenantById);
router.post('/', protect, createTenant);
router.patch('/:id', protect, updateTenant);
router.delete('/:id', protect, deleteTenant);

module.exports = router;
