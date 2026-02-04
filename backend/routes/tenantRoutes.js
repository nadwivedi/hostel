const express = require('express');
const router = express.Router();
const { unifiedProtect } = require('../middleware/unifiedAuth');
const {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
} = require('../controllers/tenantController');

// All routes use unifiedProtect - supports User, Admin, and Employee
router.get('/', unifiedProtect, getAllTenants);
router.get('/:id', unifiedProtect, getTenantById);
router.post('/', unifiedProtect, createTenant);
router.patch('/:id', unifiedProtect, updateTenant);
router.delete('/:id', unifiedProtect, deleteTenant);

module.exports = router;
