const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/employeeAuth');
const {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
} = require('../controllers/tenantController');

router.get('/', protect, getAllTenants);
router.get('/:id', protect, getTenantById);
router.post('/', protect, checkPermission('tenants', 'add'), createTenant);
router.patch('/:id', protect, checkPermission('tenants', 'edit'), updateTenant);
router.delete('/:id', protect, checkPermission('tenants', 'delete'), deleteTenant);

module.exports = router;
