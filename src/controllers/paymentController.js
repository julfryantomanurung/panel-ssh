const Database = require('../database/schema');
const TripayService = require('../services/tripayService');
const UserService = require('../services/userService');

const db = new Database();
const tripayService = new TripayService();
const userService = new UserService();

const createPayment = async (req, res) => {
  try {
    const {
      service_type,
      username,
      password,
      payment_method,
      customer_name,
      customer_phone,
      telegram_chat_id,
      duration = 30
    } = req.body;

    // Validate required fields
    if (!service_type || !username || !payment_method || !customer_name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const validTypes = ['ssh', 'vless', 'vmess', 'trojan'];
    if (!validTypes.includes(service_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service type'
      });
    }

    if (service_type === 'ssh' && !password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required for SSH service'
      });
    }

    // Get price from environment
    const priceKey = `PRICE_${service_type.toUpperCase()}_${duration}DAYS`;
    const amount = parseInt(process.env[priceKey]) || 10000;

    // Create Tripay transaction
    const tripayData = {
      method: payment_method,
      amount: amount,
      customer_name: customer_name,
      customer_phone: customer_phone,
      order_items: [
        {
          name: `${service_type.toUpperCase()} VPN - ${duration} Days`,
          price: amount,
          quantity: 1
        }
      ]
    };

    const tripayResponse = await tripayService.createTransaction(tripayData);

    if (!tripayResponse.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create payment',
        error: tripayResponse.message
      });
    }

    const paymentData = tripayResponse.data;

    // Save payment to database
    const query = `INSERT INTO payments 
      (invoice_id, reference, merchant_ref, amount, status, payment_method, 
       payment_name, pay_url, checkout_url, telegram_chat_id, service_type, service_duration) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.connection.run(
      query,
      [
        paymentData.reference,
        paymentData.reference,
        paymentData.merchant_ref,
        paymentData.amount,
        'pending',
        paymentData.payment_method,
        paymentData.payment_name,
        paymentData.pay_url,
        paymentData.checkout_url,
        telegram_chat_id || null,
        service_type,
        duration
      ],
      function(err) {
        if (err) {
          console.error('Error saving payment:', err);
          return res.status(500).json({
            success: false,
            message: 'Payment created but failed to save to database'
          });
        }

        // Store username and password in a temporary way (you might want to encrypt this)
        db.connection.run(
          `UPDATE payments SET merchant_ref = ? WHERE id = ?`,
          [JSON.stringify({ username, password }), this.lastID],
          (err) => {
            if (err) console.error('Error storing user credentials:', err);
          }
        );

        res.status(201).json({
          success: true,
          message: 'Payment created successfully',
          data: {
            payment_id: this.lastID,
            invoice_id: paymentData.reference,
            reference: paymentData.reference,
            amount: paymentData.amount,
            payment_method: paymentData.payment_name,
            pay_url: paymentData.pay_url,
            checkout_url: paymentData.checkout_url,
            expired_time: paymentData.expired_time,
            qr_url: paymentData.qr_url,
            instructions: paymentData.instructions
          }
        });
      }
    );
  } catch (error) {
    console.error('Error in createPayment:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const paymentCallback = async (req, res) => {
  try {
    const callbackData = req.body;

    // Validate signature
    if (!tripayService.validateCallback(callbackData)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const reference = callbackData.reference;
    const status = callbackData.status;

    // Get payment from database
    db.connection.get(
      'SELECT * FROM payments WHERE reference = ?',
      [reference],
      async (err, payment) => {
        if (err || !payment) {
          return res.status(404).json({
            success: false,
            message: 'Payment not found'
          });
        }

        // Update payment status
        db.connection.run(
          'UPDATE payments SET status = ?, paid_at = ? WHERE id = ?',
          [status, status === 'PAID' ? new Date().toISOString() : null, payment.id],
          async (err) => {
            if (err) {
              console.error('Error updating payment status:', err);
            }

            // If payment is successful, create the user
            if (status === 'PAID') {
              try {
                const credentials = JSON.parse(payment.merchant_ref);
                const { username, password } = credentials;

                let userData;
                if (payment.service_type === 'ssh') {
                  userData = await userService.createSSHUser(
                    username,
                    password,
                    payment.service_duration
                  );
                } else {
                  userData = await userService.createXrayUser(
                    username,
                    payment.service_type,
                    payment.service_duration
                  );
                }

                // Save user to database
                const userQuery = `INSERT INTO users 
                  (username, type, uuid, password, expires_at, status, telegram_chat_id, payment_id) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

                db.connection.run(
                  userQuery,
                  [
                    username,
                    payment.service_type,
                    userData.uuid || null,
                    password || null,
                    userData.expires_at,
                    'active',
                    payment.telegram_chat_id,
                    payment.id
                  ],
                  (err) => {
                    if (err) {
                      console.error('Error saving user:', err);
                    }
                  }
                );
              } catch (error) {
                console.error('Error creating user after payment:', error);
              }
            }

            res.json({
              success: true,
              message: 'Callback processed'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error in paymentCallback:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getPaymentStatus = async (req, res) => {
  try {
    const { invoice_id } = req.params;

    db.connection.get(
      'SELECT * FROM payments WHERE invoice_id = ? OR reference = ?',
      [invoice_id, invoice_id],
      (err, payment) => {
        if (err || !payment) {
          return res.status(404).json({
            success: false,
            message: 'Payment not found'
          });
        }

        res.json({
          success: true,
          data: {
            invoice_id: payment.invoice_id,
            reference: payment.reference,
            amount: payment.amount,
            status: payment.status,
            payment_method: payment.payment_name,
            service_type: payment.service_type,
            created_at: payment.created_at,
            paid_at: payment.paid_at
          }
        });
      }
    );
  } catch (error) {
    console.error('Error in getPaymentStatus:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createPayment,
  paymentCallback,
  getPaymentStatus
};
