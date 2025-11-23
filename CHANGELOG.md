# Changelog

All notable changes to the VPN Panel API project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-11-23

### Added

#### Core API
- Complete REST API implementation with Express.js
- User management endpoints (Create, Read, Delete)
- User configuration generation endpoint
- Payment creation and status endpoints
- Tripay payment gateway integration
- Webhook callback handler for payment notifications
- Health check endpoint
- API documentation endpoint

#### Database
- SQLite database implementation
- Database schema with 4 tables (users, payments, activity_logs, telegram_users)
- Migration script for database initialization
- Automatic database connection management

#### Security
- API key authentication middleware
- Rate limiting (100 requests per 15 minutes per IP)
- Input validation for usernames and passwords
- Command injection prevention
- Sensitive data redaction in logs
- Helmet.js security headers
- CORS support
- Activity logging for all API actions

#### Telegram Bot
- Interactive Telegram bot interface
- Service selection menu
- Guided purchase flow
- Payment method selection
- Payment status checking
- Automatic config delivery after payment
- User state management
- Multi-step conversation handling

#### User Management
- SSH user creation with system integration
- VLESS user creation with Xray integration
- VMESS user creation with Xray integration
- Trojan user creation with Xray integration
- Automatic UUID generation for Xray protocols
- User expiration handling
- User deletion with system cleanup
- Configuration generation for all user types

#### Payment System
- Support for 10+ payment methods (QRIS, Virtual Accounts, E-wallets, Retail)
- Invoice generation with Tripay
- Payment status tracking
- Automatic user creation on successful payment
- Temporary credential storage during payment flow
- Payment history tracking

#### Documentation
- Comprehensive README with setup instructions
- API examples in cURL, JavaScript, and Python
- Deployment guide with multiple options (PM2, Systemd)
- Quick reference guide for common operations
- Security policy document
- API testing script
- Setup automation script

#### Configuration
- Environment variable configuration
- Example .env file with all options
- Systemd service file
- Setup script for automated installation
- Git ignore rules for sensitive files

### Security Improvements
- Username validation (alphanumeric and underscore only)
- Password minimum length enforcement (6 characters)
- Safe command execution using stdin for passwords
- Log sanitization to prevent sensitive data exposure
- Error handling improvements
- Database error handling
- JSON parsing with error handling

### Changed
- Updated CORS dependency to version 2.8.7 for security

### Technical Details

#### Dependencies
- express: ^4.18.2
- express-rate-limit: ^7.1.5
- dotenv: ^16.3.1
- sqlite3: ^5.1.6
- axios: ^1.6.2
- node-telegram-bot-api: ^0.64.0
- uuid: ^9.0.1
- morgan: ^1.10.0
- helmet: ^7.1.0
- cors: ^2.8.7

#### System Requirements
- Node.js 14+
- NPM or Yarn
- Ubuntu 20.04+ or Debian 11+
- Root access (for SSH user creation)
- Xray Core (for VPN protocols)

#### API Endpoints

**User Management:**
- POST /api/users - Create new user
- GET /api/users - List all users (with filters)
- DELETE /api/users/:id - Delete user
- GET /api/users/:id/config - Get user configuration

**Payment Management:**
- POST /api/payments/create - Create payment invoice
- POST /api/payments/callback - Tripay webhook callback
- GET /api/payments/:invoice_id - Get payment status

**System:**
- GET /health - Health check
- GET / - API information

#### Database Schema

**users table:**
- id (INTEGER, PRIMARY KEY)
- username (TEXT, UNIQUE)
- type (TEXT)
- uuid (TEXT)
- password (TEXT)
- created_at (DATETIME)
- expires_at (DATETIME)
- status (TEXT)
- telegram_chat_id (TEXT)
- payment_id (INTEGER)

**payments table:**
- id (INTEGER, PRIMARY KEY)
- invoice_id (TEXT, UNIQUE)
- reference (TEXT, UNIQUE)
- merchant_ref (TEXT)
- amount (INTEGER)
- status (TEXT)
- payment_method (TEXT)
- payment_name (TEXT)
- pay_url (TEXT)
- checkout_url (TEXT)
- created_at (DATETIME)
- paid_at (DATETIME)
- telegram_chat_id (TEXT)
- service_type (TEXT)
- service_duration (INTEGER)

**activity_logs table:**
- id (INTEGER, PRIMARY KEY)
- action (TEXT)
- user_id (INTEGER)
- payment_id (INTEGER)
- details (TEXT)
- ip_address (TEXT)
- created_at (DATETIME)

**telegram_users table:**
- id (INTEGER, PRIMARY KEY)
- chat_id (TEXT, UNIQUE)
- username (TEXT)
- first_name (TEXT)
- last_name (TEXT)
- created_at (DATETIME)
- last_activity (DATETIME)

### Known Limitations

1. **Root Privileges**: Service requires root for SSH user creation
2. **SQLite**: Single file database, limited concurrency
3. **Temporary Password Storage**: Passwords stored plaintext during payment flow
4. **No Built-in Encryption**: Database not encrypted at rest

### Migration Notes

This is the initial release, no migration required.

### Deprecations

None in this release.

### Removed

None in this release.

### Fixed

None (initial release).

### Security

- All identified security issues from code review addressed
- CodeQL security scan passed with 0 alerts
- Input validation prevents command injection
- Sensitive data redacted from logs
- Rate limiting prevents abuse
- API key authentication secures endpoints

## [Unreleased]

### Planned Features

- User expiration checker (cron job)
- Email notifications
- Admin web dashboard
- Usage statistics and analytics
- Multiple duration options (7, 14, 30 days)
- User bandwidth tracking
- Reseller account support
- API versioning
- WebSocket for real-time updates
- Database encryption
- PostgreSQL/MySQL support
- User password encryption
- Multi-language support for bot
- Payment refund handling

### Planned Improvements

- Automated testing suite
- CI/CD pipeline
- Docker containerization
- Kubernetes deployment guide
- Performance benchmarks
- Load balancing support
- Redis caching
- Session management
- Two-factor authentication
- OAuth2 integration

---

## Version History

- **1.0.0** (2024-11-23): Initial release with complete functionality

## Contributing

When contributing, please:
1. Update CHANGELOG.md with your changes
2. Follow [Keep a Changelog](https://keepachangelog.com/) format
3. Include version number and date
4. List changes under appropriate categories

## Categories

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Now removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements

---

**Note**: This changelog is maintained alongside the codebase. For detailed commit history, see the git log.
