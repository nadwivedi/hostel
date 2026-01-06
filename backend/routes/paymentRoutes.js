const express = require('express');
const router = express.Router();
const {
  getAllPayments,
  getPaymentById,
  getPaymentsByTenant,
  createPayment,
  updatePayment,
  deletePayment,
} = require('../controllers/paymentController');

router.get('/', getAllPayments);
router.get('/:id', getPaymentById);
router.get('/tenant/:tenantId', getPaymentsByTenant);
router.post('/', createPayment);
router.patch('/:id', updatePayment);
router.delete('/:id', deletePayment);

module.exports = router;
