# VPN Panel API

REST API lengkap untuk mengelola user SSH, VLESS, VMESS, dan Trojan dengan integrasi pembayaran Tripay dan Telegram Bot.

## 🚀 Fitur

- ✅ REST API untuk manajemen user (SSH, VLESS, VMESS, Trojan)
- 💳 Integrasi Tripay untuk pembayaran otomatis
- 🤖 Telegram Bot untuk interface user
- 🔐 API key authentication
- 🚦 Rate limiting
- 📝 Activity logging
- 💾 Database SQLite
- 🔒 Security features (Helmet, CORS)

## 📋 Prasyarat

- Node.js 14+ 
- NPM atau Yarn
- Domain dengan SSL (untuk production)
- Akun Tripay (API Key & Private Key)
- Telegram Bot Token

## 🛠️ Instalasi

### 1. Clone dan Install Dependencies

```bash
cd /home/runner/work/panel-ssh/panel-ssh
npm install
```

### 2. Konfigurasi Environment

Salin `.env.example` ke `.env` dan sesuaikan:

```bash
cp .env.example .env
nano .env
```

Isi konfigurasi yang diperlukan:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# API Security
API_KEY=your-secret-api-key-here-change-this

# Database
DATABASE_PATH=./data/panel.db

# Tripay Configuration
TRIPAY_API_KEY=your-tripay-api-key
TRIPAY_PRIVATE_KEY=your-tripay-private-key
TRIPAY_MERCHANT_CODE=your-merchant-code
TRIPAY_MODE=sandbox
TRIPAY_CALLBACK_URL=https://yourdomain.com/api/payments/callback

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_ADMIN_ID=your-telegram-admin-id

# VPS Configuration
DOMAIN=yourdomain.com
XRAY_CONFIG_PATH=/usr/local/etc/xray/config.json

# Service Pricing (in IDR)
PRICE_SSH_30DAYS=10000
PRICE_VLESS_30DAYS=15000
PRICE_VMESS_30DAYS=15000
PRICE_TROJAN_30DAYS=15000
```

### 3. Inisialisasi Database

```bash
npm run migrate
```

### 4. Jalankan Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Atau dengan PM2:
```bash
pm2 start src/server.js --name vpn-panel-api
pm2 save
pm2 startup
```

## 📚 API Documentation

### Authentication

Semua endpoint (kecuali callback) memerlukan API key di header:

```
X-API-KEY: your-api-key-here
```

### User Management Endpoints

#### 1. Create User

**POST** `/api/users`

Membuat user SSH, VLESS, VMESS, atau Trojan.

Request Body:
```json
{
  "username": "testuser",
  "type": "ssh",
  "password": "password123",
  "days": 30
}
```

Untuk Xray (VLESS/VMESS/Trojan), password tidak diperlukan (UUID auto-generated).

Response:
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": 1,
    "username": "testuser",
    "type": "ssh",
    "expires_at": "2024-01-23T10:00:00.000Z"
  }
}
```

#### 2. List Users

**GET** `/api/users?type=ssh&status=active`

Query Parameters:
- `type` (optional): Filter by type (ssh, vless, vmess, trojan)
- `status` (optional): Filter by status (active, expired)

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "testuser",
      "type": "ssh",
      "status": "active",
      "created_at": "2024-01-01T10:00:00.000Z",
      "expires_at": "2024-01-31T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### 3. Delete User

**DELETE** `/api/users/:id`

Response:
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

#### 4. Get User Config

**GET** `/api/users/:id/config`

Response untuk SSH:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "type": "ssh"
    },
    "config": {
      "type": "ssh",
      "host": "yourdomain.com",
      "port": 22,
      "username": "testuser",
      "password": "password123",
      "connection_string": "ssh testuser@yourdomain.com"
    }
  }
}
```

Response untuk VLESS/VMESS/Trojan:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "username": "testuser2",
      "type": "vless"
    },
    "config": {
      "type": "vless",
      "host": "yourdomain.com",
      "port": 443,
      "uuid": "uuid-here",
      "path": "/vless",
      "security": "tls",
      "link": "vless://uuid@domain:443?..."
    }
  }
}
```

### Payment Endpoints

#### 1. Create Payment

**POST** `/api/payments/create`

Request Body:
```json
{
  "service_type": "ssh",
  "username": "newuser",
  "password": "password123",
  "payment_method": "BCAVA",
  "customer_name": "John Doe",
  "customer_phone": "08123456789",
  "telegram_chat_id": "123456789",
  "duration": 30
}
```

Response:
```json
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "payment_id": 1,
    "invoice_id": "T12345678",
    "reference": "T12345678",
    "amount": 10000,
    "payment_method": "BCA Virtual Account",
    "pay_url": "https://tripay.co.id/checkout/...",
    "checkout_url": "https://tripay.co.id/checkout/...",
    "expired_time": 1640000000,
    "qr_url": "https://...",
    "instructions": [...]
  }
}
```

#### 2. Payment Callback (Webhook)

**POST** `/api/payments/callback`

Endpoint ini dipanggil otomatis oleh Tripay setelah pembayaran. Tidak memerlukan API key.

Request Body (dari Tripay):
```json
{
  "reference": "T12345678",
  "status": "PAID",
  "merchant_ref": "INV-1640000000",
  "signature": "..."
}
```

#### 3. Get Payment Status

**GET** `/api/payments/:invoice_id`

Response:
```json
{
  "success": true,
  "data": {
    "invoice_id": "T12345678",
    "reference": "T12345678",
    "amount": 10000,
    "status": "PAID",
    "payment_method": "BCA Virtual Account",
    "service_type": "ssh",
    "created_at": "2024-01-01T10:00:00.000Z",
    "paid_at": "2024-01-01T11:00:00.000Z"
  }
}
```

## 🤖 Telegram Bot

### Setup Bot

1. Buat bot baru dengan BotFather di Telegram
2. Dapatkan token dan masukkan ke `.env`
3. Bot akan otomatis aktif saat server dijalankan

### Fitur Bot

- `/start` - Memulai bot dan menampilkan menu utama
- 🛒 Beli Layanan - Flow pembelian interaktif
- 📊 Cek Status - Cek status pembayaran dan download config
- ❓ Bantuan - Panduan penggunaan

### Flow Pembelian via Bot

1. User klik "Beli Layanan"
2. Pilih jenis layanan (SSH/VLESS/VMESS/Trojan)
3. Input username
4. Input password (jika SSH)
5. Input nama dan nomor telepon
6. Pilih metode pembayaran
7. Lakukan pembayaran
8. Setelah sukses, config dikirim otomatis

## 🔒 Security Features

### 1. API Key Authentication

Semua endpoint (kecuali callback) dilindungi dengan API key:

```javascript
headers: {
  'X-API-KEY': 'your-api-key'
}
```

### 2. Rate Limiting

- 100 requests per 15 menit per IP
- Berlaku untuk semua endpoint `/api/*`

### 3. Activity Logging

Semua aktivitas dicatat di tabel `activity_logs`:
- Action type
- User/payment ID
- Request details
- IP address
- Timestamp

### 4. Helmet.js

Proteksi header HTTP standar untuk keamanan aplikasi web.

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  uuid TEXT,
  password TEXT,
  created_at DATETIME,
  expires_at DATETIME,
  status TEXT,
  telegram_chat_id TEXT,
  payment_id INTEGER
);
```

### Payments Table
```sql
CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  invoice_id TEXT UNIQUE NOT NULL,
  reference TEXT UNIQUE NOT NULL,
  merchant_ref TEXT,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_name TEXT,
  pay_url TEXT,
  checkout_url TEXT,
  created_at DATETIME,
  paid_at DATETIME,
  telegram_chat_id TEXT,
  service_type TEXT NOT NULL,
  service_duration INTEGER DEFAULT 30
);
```

## 🧪 Testing

### Manual Testing with cURL

Test health endpoint:
```bash
curl http://localhost:3000/health
```

Test create user:
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "username": "testuser",
    "type": "ssh",
    "password": "password123",
    "days": 30
  }'
```

Test list users:
```bash
curl http://localhost:3000/api/users \
  -H "X-API-KEY: your-api-key"
```

## 🚀 Deployment

### Dengan PM2

```bash
# Install PM2
npm install -g pm2

# Start aplikasi
pm2 start src/server.js --name vpn-panel-api

# Save konfigurasi
pm2 save

# Setup auto-start
pm2 startup

# Monitor
pm2 monit
```

### Dengan Systemd

Buat file service `/etc/systemd/system/vpn-panel.service`:

```ini
[Unit]
Description=VPN Panel API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/runner/work/panel-ssh/panel-ssh
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable dan start:
```bash
systemctl enable vpn-panel
systemctl start vpn-panel
systemctl status vpn-panel
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 📝 Logs

Logs disimpan di:
- Console output (stdout/stderr)
- Database table `activity_logs`

View logs dengan PM2:
```bash
pm2 logs vpn-panel-api
```

## 🐛 Troubleshooting

### Database Error

```bash
# Re-initialize database
rm data/panel.db
npm run migrate
```

### Telegram Bot Not Starting

- Pastikan `TELEGRAM_BOT_TOKEN` sudah diset di `.env`
- Cek token valid dengan test API Telegram

### Payment Not Working

- Pastikan Tripay API keys sudah benar
- Cek mode (sandbox/production)
- Pastikan callback URL accessible dari internet

### User Creation Failed

- Cek permission untuk create user SSH
- Pastikan Xray config path benar
- Cek service Xray running

## 📄 License

MIT License

## 👥 Support

Untuk bantuan dan pertanyaan, hubungi admin atau buka issue di repository.

## 🔄 Updates

### v1.0.0 (2024)
- Initial release
- REST API untuk user management
- Integrasi Tripay payment
- Telegram Bot interface
- Security features
- Activity logging
