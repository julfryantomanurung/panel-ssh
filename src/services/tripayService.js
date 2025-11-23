const axios = require('axios');
const crypto = require('crypto');

class TripayService {
  constructor() {
    this.apiKey = process.env.TRIPAY_API_KEY;
    this.privateKey = process.env.TRIPAY_PRIVATE_KEY;
    this.merchantCode = process.env.TRIPAY_MERCHANT_CODE;
    this.mode = process.env.TRIPAY_MODE || 'sandbox';
    this.baseUrl = this.mode === 'production' 
      ? 'https://tripay.co.id/api'
      : 'https://tripay.co.id/api-sandbox';
  }

  generateSignature(merchantRef, amount) {
    const data = this.merchantCode + merchantRef + amount;
    return crypto
      .createHmac('sha256', this.privateKey)
      .update(data)
      .digest('hex');
  }

  async getPaymentChannels() {
    try {
      const response = await axios.get(`${this.baseUrl}/merchant/payment-channel`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting payment channels:', error);
      throw new Error('Failed to get payment channels');
    }
  }

  async createTransaction(data) {
    const merchantRef = 'INV-' + Date.now();
    const signature = this.generateSignature(merchantRef, data.amount);

    const payload = {
      method: data.method,
      merchant_ref: merchantRef,
      amount: data.amount,
      customer_name: data.customer_name,
      customer_email: data.customer_email || 'noreply@example.com',
      customer_phone: data.customer_phone || '08123456789',
      order_items: data.order_items,
      callback_url: process.env.TRIPAY_CALLBACK_URL,
      return_url: data.return_url || process.env.TRIPAY_CALLBACK_URL,
      expired_time: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      signature: signature
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/create`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error creating transaction:', error.response?.data || error.message);
      throw new Error('Failed to create transaction');
    }
  }

  async getTransactionDetail(reference) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/detail`,
        {
          params: { reference },
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting transaction detail:', error);
      throw new Error('Failed to get transaction detail');
    }
  }

  validateCallback(data) {
    const signature = crypto
      .createHmac('sha256', this.privateKey)
      .update(JSON.stringify(data))
      .digest('hex');
    
    return signature === data.signature;
  }
}

module.exports = TripayService;
