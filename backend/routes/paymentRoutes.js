const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/employeeAuth');
const {
  getAllPayments,
  getDashboardPendingPayments,
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

// Read-only routes — view permission sufficient
router.get('/', protect, getAllPayments);
router.get('/dashboard/pending', protect, getDashboardPendingPayments);
router.get('/upcoming', protect, getUpcomingPayments);
router.get('/overdue', protect, getOverduePayments);
router.get('/tenant/:tenantId', protect, getPaymentsByTenant);
router.get('/:id', protect, getPaymentById);

// Write routes — require explicit permission
router.post('/', protect, checkPermission('payments', 'add'), createPayment);
router.post('/:id/mark-paid', protect, checkPermission('payments', 'edit'), markAsPaid);
router.post('/:id/track-reminder', protect, trackReminder); // reminders are informational, no special perm
router.patch('/:id', protect, checkPermission('payments', 'edit'), updatePayment);
router.delete('/:id', protect, checkPermission('payments', 'delete'), deletePayment);

module.exports = router;
