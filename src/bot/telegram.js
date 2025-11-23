const TelegramBot = require('node-telegram-bot-api');
const Database = require('../database/schema');
const TripayService = require('../services/tripayService');
const UserService = require('../services/userService');

class TelegramBotService {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    if (!this.token) {
      console.error('TELEGRAM_BOT_TOKEN is not set');
      return;
    }

    this.bot = new TelegramBot(this.token, { polling: true });
    this.db = new Database();
    this.tripayService = new TripayService();
    this.userService = new UserService();
    
    this.userStates = {};
    this.setupHandlers();
  }

  setupHandlers() {
    // Start command
    this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
    
    // Callback query handler
    this.bot.on('callback_query', (query) => this.handleCallback(query));
    
    // Text message handler
    this.bot.on('message', (msg) => this.handleMessage(msg));
  }

  handleStart(msg) {
    const chatId = msg.chat.id;
    const username = msg.from.username || msg.from.first_name;

    // Save telegram user
    this.db.connection.run(
      `INSERT OR REPLACE INTO telegram_users (chat_id, username, first_name, last_name, last_activity) 
       VALUES (?, ?, ?, ?, ?)`,
      [chatId, username, msg.from.first_name, msg.from.last_name, new Date().toISOString()]
    );

    const welcomeMessage = `
🎉 *Selamat Datang di VPN Panel Bot!* 🎉

Saya adalah bot untuk pembelian layanan VPN.

Layanan yang tersedia:
🔐 SSH - Rp ${process.env.PRICE_SSH_30DAYS || '10,000'}/30 hari
🚀 VLESS - Rp ${process.env.PRICE_VLESS_30DAYS || '15,000'}/30 hari
⚡ VMESS - Rp ${process.env.PRICE_VMESS_30DAYS || '15,000'}/30 hari
🔒 TROJAN - Rp ${process.env.PRICE_TROJAN_30DAYS || '15,000'}/30 hari

Silakan pilih menu di bawah:
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🛒 Beli Layanan', callback_data: 'buy_service' },
          { text: '📊 Cek Status', callback_data: 'check_status' }
        ],
        [
          { text: '❓ Bantuan', callback_data: 'help' }
        ]
      ]
    };

    this.bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async handleCallback(query) {
    const chatId = query.message.chat.id;
    const data = query.data;

    this.bot.answerCallbackQuery(query.id);

    if (data === 'buy_service') {
      this.showServiceSelection(chatId);
    } else if (data === 'check_status') {
      this.checkPaymentStatus(chatId);
    } else if (data === 'help') {
      this.showHelp(chatId);
    } else if (data.startsWith('service_')) {
      const serviceType = data.replace('service_', '');
      this.startPurchaseFlow(chatId, serviceType);
    } else if (data.startsWith('payment_')) {
      const paymentMethod = data.replace('payment_', '');
      this.processPayment(chatId, paymentMethod);
    } else if (data.startsWith('config_')) {
      const userId = data.replace('config_', '');
      this.sendUserConfig(chatId, userId);
    }
  }

  showServiceSelection(chatId) {
    const message = '🛒 *Pilih Layanan yang Ingin Dibeli:*';
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔐 SSH', callback_data: 'service_ssh' },
          { text: '🚀 VLESS', callback_data: 'service_vless' }
        ],
        [
          { text: '⚡ VMESS', callback_data: 'service_vmess' },
          { text: '🔒 TROJAN', callback_data: 'service_trojan' }
        ],
        [
          { text: '« Kembali', callback_data: 'start' }
        ]
      ]
    };

    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  startPurchaseFlow(chatId, serviceType) {
    this.userStates[chatId] = { 
      step: 'awaiting_username', 
      service_type: serviceType 
    };

    const message = `
✅ Anda memilih layanan: *${serviceType.toUpperCase()}*

Silakan masukkan username yang diinginkan:
(Hanya huruf, angka, dan underscore)
    `;

    this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  handleMessage(msg) {
    if (!msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const state = this.userStates[chatId];

    if (!state) return;

    if (state.step === 'awaiting_username') {
      const username = msg.text.trim();
      
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        this.bot.sendMessage(chatId, '❌ Username tidak valid. Gunakan hanya huruf, angka, dan underscore.');
        return;
      }

      this.userStates[chatId].username = username;

      if (state.service_type === 'ssh') {
        this.userStates[chatId].step = 'awaiting_password';
        this.bot.sendMessage(chatId, '🔑 Masukkan password untuk SSH:');
      } else {
        this.userStates[chatId].step = 'awaiting_name';
        this.bot.sendMessage(chatId, '👤 Masukkan nama lengkap Anda:');
      }
    } else if (state.step === 'awaiting_password') {
      this.userStates[chatId].password = msg.text.trim();
      this.userStates[chatId].step = 'awaiting_name';
      this.bot.sendMessage(chatId, '👤 Masukkan nama lengkap Anda:');
    } else if (state.step === 'awaiting_name') {
      this.userStates[chatId].customer_name = msg.text.trim();
      this.userStates[chatId].step = 'awaiting_phone';
      this.bot.sendMessage(chatId, '📱 Masukkan nomor telepon Anda (contoh: 08123456789):');
    } else if (state.step === 'awaiting_phone') {
      const phone = msg.text.trim();
      
      if (!/^(\+62|62|0)[0-9]{9,12}$/.test(phone)) {
        this.bot.sendMessage(chatId, '❌ Nomor telepon tidak valid. Gunakan format: 08123456789');
        return;
      }

      this.userStates[chatId].customer_phone = phone;
      this.showPaymentMethods(chatId);
    }
  }

  async showPaymentMethods(chatId) {
    const message = '💳 *Pilih Metode Pembayaran:*';
    
    // Common payment methods in Indonesia
    const keyboard = {
      inline_keyboard: [
        [
          { text: 'QRIS', callback_data: 'payment_QRIS' }
        ],
        [
          { text: 'BCA Virtual Account', callback_data: 'payment_BCAVA' },
          { text: 'BNI Virtual Account', callback_data: 'payment_BNIVA' }
        ],
        [
          { text: 'Mandiri Virtual Account', callback_data: 'payment_MANDIRIVA' },
          { text: 'BRI Virtual Account', callback_data: 'payment_BRIVA' }
        ],
        [
          { text: 'Alfamart', callback_data: 'payment_ALFAMART' },
          { text: 'Indomaret', callback_data: 'payment_INDOMARET' }
        ]
      ]
    };

    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async processPayment(chatId, paymentMethod) {
    const state = this.userStates[chatId];
    
    if (!state) {
      this.bot.sendMessage(chatId, '❌ Session expired. Please start again with /start');
      return;
    }

    try {
      this.bot.sendMessage(chatId, '⏳ Memproses pembayaran...');

      const priceKey = `PRICE_${state.service_type.toUpperCase()}_30DAYS`;
      const amount = parseInt(process.env[priceKey]) || 10000;

      const tripayData = {
        method: paymentMethod,
        amount: amount,
        customer_name: state.customer_name,
        customer_phone: state.customer_phone,
        order_items: [
          {
            name: `${state.service_type.toUpperCase()} VPN - 30 Days`,
            price: amount,
            quantity: 1
          }
        ]
      };

      const tripayResponse = await this.tripayService.createTransaction(tripayData);

      if (!tripayResponse.success) {
        this.bot.sendMessage(chatId, '❌ Gagal membuat pembayaran. Silakan coba lagi.');
        return;
      }

      const paymentData = tripayResponse.data;

      // Save to database
      const query = `INSERT INTO payments 
        (invoice_id, reference, merchant_ref, amount, status, payment_method, 
         payment_name, pay_url, checkout_url, telegram_chat_id, service_type, service_duration) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      this.db.connection.run(
        query,
        [
          paymentData.reference,
          paymentData.reference,
          JSON.stringify({ username: state.username, password: state.password }),
          paymentData.amount,
          'pending',
          paymentData.payment_method,
          paymentData.payment_name,
          paymentData.pay_url,
          paymentData.checkout_url,
          chatId,
          state.service_type,
          30
        ],
        (err) => {
          if (err) {
            console.error('Error saving payment:', err);
            this.bot.sendMessage(chatId, '❌ Terjadi kesalahan. Silakan hubungi admin.');
            return;
          }

          const message = `
✅ *Pembayaran Berhasil Dibuat!*

Invoice: \`${paymentData.reference}\`
Jumlah: Rp ${paymentData.amount.toLocaleString('id-ID')}
Metode: ${paymentData.payment_name}

🔗 Link Pembayaran:
${paymentData.checkout_url}

⏰ Berlaku sampai: ${new Date(paymentData.expired_time * 1000).toLocaleString('id-ID')}

Setelah pembayaran berhasil, konfigurasi VPN akan dikirim otomatis.
          `;

          this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

          // Clear state
          delete this.userStates[chatId];
        }
      );
    } catch (error) {
      console.error('Error processing payment:', error);
      this.bot.sendMessage(chatId, '❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  checkPaymentStatus(chatId) {
    this.db.connection.all(
      'SELECT * FROM payments WHERE telegram_chat_id = ? ORDER BY created_at DESC LIMIT 5',
      [chatId],
      (err, payments) => {
        if (err || !payments || payments.length === 0) {
          this.bot.sendMessage(chatId, 'Anda belum memiliki transaksi.');
          return;
        }

        let message = '📊 *Status Pembayaran Anda:*\n\n';

        payments.forEach((payment, index) => {
          const statusEmoji = payment.status === 'PAID' ? '✅' : '⏳';
          message += `${index + 1}. ${statusEmoji} Invoice: \`${payment.invoice_id}\`\n`;
          message += `   Layanan: ${payment.service_type.toUpperCase()}\n`;
          message += `   Status: ${payment.status}\n`;
          message += `   Tanggal: ${new Date(payment.created_at).toLocaleString('id-ID')}\n\n`;
        });

        const keyboard = {
          inline_keyboard: []
        };

        // Add config download buttons for paid payments
        payments.forEach((payment) => {
          if (payment.status === 'PAID') {
            this.db.connection.get(
              'SELECT id FROM users WHERE payment_id = ?',
              [payment.id],
              (err, user) => {
                if (user) {
                  keyboard.inline_keyboard.push([
                    { 
                      text: `📥 Download Config ${payment.service_type.toUpperCase()}`, 
                      callback_data: `config_${user.id}` 
                    }
                  ]);
                }
              }
            );
          }
        });

        this.bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }
    );
  }

  sendUserConfig(chatId, userId) {
    this.db.connection.get(
      'SELECT * FROM users WHERE id = ?',
      [userId],
      (err, user) => {
        if (err || !user) {
          this.bot.sendMessage(chatId, '❌ Konfigurasi tidak ditemukan.');
          return;
        }

        const config = this.userService.generateConfig(user);
        
        let message = `
🎉 *Konfigurasi ${user.type.toUpperCase()} Anda*

Username: \`${user.username}\`
        `;

        if (config.link) {
          message += `\n📱 Link: \`${config.link}\``;
        }

        if (user.type === 'ssh') {
          message += `
Password: \`${user.password}\`
Host: \`${config.host}\`
Port: \`${config.port}\`

Command:
\`\`\`
${config.connection_string}
\`\`\`
          `;
        } else {
          message += `
UUID/Password: \`${user.uuid}\`
Host: \`${config.host}\`
Port: \`${config.port}\`
Path: \`${config.path}\`
Security: \`${config.security}\`
          `;
        }

        message += `\n⏰ Berlaku sampai: ${new Date(user.expires_at).toLocaleString('id-ID')}`;

        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      }
    );
  }

  showHelp(chatId) {
    const message = `
❓ *Bantuan*

*Cara Pembelian:*
1. Klik "Beli Layanan"
2. Pilih jenis layanan (SSH/VLESS/VMESS/TROJAN)
3. Masukkan username dan data yang diminta
4. Pilih metode pembayaran
5. Lakukan pembayaran sesuai instruksi
6. Setelah pembayaran berhasil, konfigurasi akan dikirim otomatis

*Cek Status Pembayaran:*
Klik "Cek Status" untuk melihat status pembayaran dan download konfigurasi

*Butuh Bantuan?*
Hubungi admin: @${process.env.TELEGRAM_ADMIN_ID || 'admin'}
    `;

    this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  async notifyPaymentSuccess(payment, user) {
    if (!payment.telegram_chat_id) return;

    const message = `
🎉 *Pembayaran Berhasil!*

Invoice: \`${payment.invoice_id}\`
Layanan: ${payment.service_type.toUpperCase()}

Akun Anda telah aktif!
Username: \`${user.username}\`

Klik tombol di bawah untuk download konfigurasi:
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📥 Download Konfigurasi', callback_data: `config_${user.id}` }
        ]
      ]
    };

    this.bot.sendMessage(payment.telegram_chat_id, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  start() {
    console.log('Telegram bot started');
  }
}

module.exports = TelegramBotService;
