const express = require('express');
const router = express.Router();
const { apiKeyAuth } = require('../middleware/auth');
const { logActivity } = require('../middleware/logger');
const {
  createPayment,
  paymentCallback,
  getPaymentStatus
} = require('../controllers/paymentController');

// Payment creation requires API key
router.post('/create', apiKeyAuth, logActivity('create_payment'), createPayment);

// Callback does not require API key (called by Tripay)
router.post('/callback', logActivity('payment_callback'), paymentCallback);

// Status check requires API key
router.get('/:invoice_id', apiKeyAuth, logActivity('get_payment_status'), getPaymentStatus);

module.exports = router;
