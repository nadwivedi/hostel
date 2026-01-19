const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { protectAdmin } = require('../middleware/adminAuth');
const {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
} = require('../controllers/tenantController');

router.get('/', protect, getAllTenants);
router.get('/:id', protect, getTenantById);
router.post('/', protectAdmin, createTenant);
router.patch('/:id', protectAdmin, updateTenant);
router.delete('/:id', protectAdmin, deleteTenant);

module.exports = router;
