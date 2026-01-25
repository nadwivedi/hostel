const express = require('express');
const router = express.Router();
const { protectAll } = require('../middleware/authAll');
const {
  getAllPayments,
  getPaymentById,
  getPaymentsByTenant,
  getPaymentsByOccupancy,
  createPayment,
  updatePayment,
  deletePayment,
  markAsPaid,
  getUpcomingPayments,
  getOverduePayments,
} = require('../controllers/paymentController');

// All routes use protectAll - authorization is handled in controllers
router.get('/', protectAll, getAllPayments);
router.get('/upcoming', protectAll, getUpcomingPayments);
router.get('/overdue', protectAll, getOverduePayments);
router.get('/tenant/:tenantId', protectAll, getPaymentsByTenant);
router.get('/occupancy/:occupancyId', protectAll, getPaymentsByOccupancy);
router.get('/:id', protectAll, getPaymentById);
router.post('/', protectAll, createPayment);
router.post('/:id/mark-paid', protectAll, markAsPaid);
router.patch('/:id', protectAll, updatePayment);
router.delete('/:id', protectAll, deletePayment);

module.exports = router;
