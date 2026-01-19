const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { protectAdmin } = require('../middleware/adminAuth');
const {
  getAllPayments,
  getPaymentById,
  getPaymentsByTenant,
  createPayment,
  updatePayment,
  deletePayment,
} = require('../controllers/paymentController');

router.get('/', protect, getAllPayments);
router.get('/:id', protect, getPaymentById);
router.get('/tenant/:tenantId', protect, getPaymentsByTenant);
router.post('/', protectAdmin, createPayment);
router.patch('/:id', protectAdmin, updatePayment);
router.delete('/:id', protectAdmin, deletePayment);

module.exports = router;
