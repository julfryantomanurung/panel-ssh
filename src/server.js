require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const Database = require('./database/schema');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const TelegramBotService = require('./bot/telegram');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Logging middleware
app.use(morgan('combined'));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

app.use('/api/', limiter);

// Initialize database
const db = new Database();
db.initialize()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

// Initialize Telegram bot
let telegramBot;
if (process.env.TELEGRAM_BOT_TOKEN) {
  telegramBot = new TelegramBotService();
  telegramBot.start();
} else {
  console.warn('TELEGRAM_BOT_TOKEN not set, Telegram bot will not start');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API documentation endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'VPN Panel API',
    version: '1.0.0',
    endpoints: {
      users: {
        'POST /api/users': 'Create new user',
        'GET /api/users': 'List all users',
        'DELETE /api/users/:id': 'Delete user',
        'GET /api/users/:id/config': 'Get user configuration'
      },
      payments: {
        'POST /api/payments/create': 'Create payment invoice',
        'POST /api/payments/callback': 'Payment callback webhook',
        'GET /api/payments/:invoice_id': 'Get payment status'
      }
    },
    authentication: 'All endpoints except callback require X-API-KEY header',
    documentation: 'See README.md for detailed documentation'
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   VPN Panel API Server Started        ║
╠═══════════════════════════════════════╣
║   Port: ${PORT.toString().padEnd(30)} ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(21)} ║
║   Database: Connected                 ║
║   Telegram Bot: ${(telegramBot ? 'Active' : 'Disabled').padEnd(18)} ║
╚═══════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  db.close().then(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  db.close().then(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});

module.exports = app;
