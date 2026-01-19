const express = require('express');
const router = express.Router();
const { protectAll } = require('../middleware/authAll');
const {
  getAllPayments,
  getPaymentById,
  getPaymentsByTenant,
  createPayment,
  updatePayment,
  deletePayment,
} = require('../controllers/paymentController');

// All routes use protectAll - authorization is handled in controllers
router.get('/', protectAll, getAllPayments);
router.get('/:id', protectAll, getPaymentById);
router.get('/tenant/:tenantId', protectAll, getPaymentsByTenant);
router.post('/', protectAll, createPayment);
router.patch('/:id', protectAll, updatePayment);
router.delete('/:id', protectAll, deletePayment);

module.exports = router;
