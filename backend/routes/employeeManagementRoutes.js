const express = require('express');
const router = express.Router();
const { protectEmployee, requirePermission } = require('../middleware/employeeAuth');
const controller = require('../controllers/employeeManagementController');

router.use(protectEmployee);

router.get('/properties', requirePermission('properties', 'view'), controller.getMyProperties);
router.get('/properties/:propertyId', requirePermission('properties', 'view'), controller.getMyPropertyById);
router.get('/properties/:propertyId/buildings', requirePermission('buildings', 'view'), controller.getPropertyBuildings);
router.get('/properties/:propertyId/rooms', requirePermission('rooms', 'view'), controller.getPropertyRooms);
router.get('/properties/:propertyId/tenants', requirePermission('tenants', 'view'), controller.getPropertyTenants);

router.post('/tenants', requirePermission('tenants', 'add'), controller.createTenant);
router.patch('/tenants/:tenantId', requirePermission('tenants', 'edit'), controller.updateTenant);
router.patch('/tenants/:tenantId/mark-left', requirePermission('tenants', 'edit'), controller.markTenantLeft);
router.delete('/tenants/:tenantId', requirePermission('tenants', 'delete'), controller.deleteTenant);

router.patch('/rooms/:roomId/mark-empty', requirePermission('rooms', 'edit'), controller.markRoomEmpty);

module.exports = router;
