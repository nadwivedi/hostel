const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAllPayments,
  getPaymentById,
  getPaymentsByTenant,
  createPayment,
  updatePayment,
  deletePayment,
  markAsPaid,
  getUpcomingPayments,
  getOverduePayments,
  trackReminder,
} = require('../controllers/paymentController');

// All routes use protect - authorization is handled in controllers
router.get('/', protect, getAllPayments);
router.get('/upcoming', protect, getUpcomingPayments);
router.get('/overdue', protect, getOverduePayments);
router.get('/tenant/:tenantId', protect, getPaymentsByTenant);
router.get('/:id', protect, getPaymentById);
router.post('/', protect, createPayment);
router.post('/:id/mark-paid', protect, markAsPaid);
router.post('/:id/track-reminder', protect, trackReminder);
router.patch('/:id', protect, updatePayment);
router.delete('/:id', protect, deletePayment);

module.exports = router;
