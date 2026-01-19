const express = require('express');
const router = express.Router();
const { protectAll } = require('../middleware/authAll');
const {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
} = require('../controllers/tenantController');

// All routes use protectAll - authorization is handled in controllers
router.get('/', protectAll, getAllTenants);
router.get('/:id', protectAll, getTenantById);
router.post('/', protectAll, createTenant);
router.patch('/:id', protectAll, updateTenant);
router.delete('/:id', protectAll, deleteTenant);

module.exports = router;
