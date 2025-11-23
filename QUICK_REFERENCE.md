# Quick Reference Guide

Cheat sheet untuk operasi umum VPN Panel API.

## 🚀 Quick Start

```bash
# 1. Setup
./setup.sh

# 2. Configure
nano .env

# 3. Start
pm2 start src/server.js --name vpn-panel-api

# 4. Test
curl http://localhost:3000/health
```

## 📝 Common Commands

### Service Management

```bash
# PM2
pm2 start src/server.js --name vpn-panel-api
pm2 stop vpn-panel-api
pm2 restart vpn-panel-api
pm2 status
pm2 logs vpn-panel-api
pm2 monit

# Systemd
systemctl start vpn-panel-api
systemctl stop vpn-panel-api
systemctl restart vpn-panel-api
systemctl status vpn-panel-api
journalctl -u vpn-panel-api -f
```

### Database

```bash
# Access database
sqlite3 data/panel.db

# Common queries
SELECT * FROM users;
SELECT * FROM payments WHERE status='PAID';
SELECT COUNT(*) FROM users WHERE type='ssh';
SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10;

# Backup
cp data/panel.db data/panel.db.backup

# Restore
cp data/panel.db.backup data/panel.db

# Re-initialize
rm data/panel.db && npm run migrate
```

### API Testing

```bash
# Set variables
API_KEY="your-api-key"
API_URL="http://localhost:3000/api"

# Health check
curl http://localhost:3000/health

# List users
curl $API_URL/users -H "X-API-KEY: $API_KEY"

# Create SSH user
curl -X POST $API_URL/users \
  -H "X-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","type":"ssh","password":"pass123"}'

# Get user config
curl $API_URL/users/1/config -H "X-API-KEY: $API_KEY"

# Delete user
curl -X DELETE $API_URL/users/1 -H "X-API-KEY: $API_KEY"
```

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Environment variables |
| `package.json` | Dependencies |
| `src/server.js` | Main server |
| `data/panel.db` | Database |
| `vpn-panel-api.service` | Systemd service |

## 📊 Important Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/health` | No | Health check |
| GET | `/` | No | API info |
| POST | `/api/users` | Yes | Create user |
| GET | `/api/users` | Yes | List users |
| DELETE | `/api/users/:id` | Yes | Delete user |
| GET | `/api/users/:id/config` | Yes | Get config |
| POST | `/api/payments/create` | Yes | Create payment |
| POST | `/api/payments/callback` | No | Tripay webhook |
| GET | `/api/payments/:id` | Yes | Payment status |

## 🔐 Security

```bash
# View API key
grep API_KEY .env

# Change API key
sed -i 's/API_KEY=.*/API_KEY=new-key-here/' .env
pm2 restart vpn-panel-api

# Check activity logs
sqlite3 data/panel.db "SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 20;"
```

## 🐛 Troubleshooting

```bash
# Check if running
curl http://localhost:3000/health

# View errors
pm2 logs vpn-panel-api --err

# Check port
lsof -i :3000
netstat -tulpn | grep 3000

# Check Node.js
node --version
which node

# Test manually
cd /root/panel-ssh && node src/server.js

# Check environment
cat .env

# Check database
ls -l data/panel.db
sqlite3 data/panel.db ".tables"
```

## 📦 Updates

```bash
# Backup first
cp data/panel.db data/panel.db.backup

# Update code
git pull

# Update dependencies
npm install

# Restart
pm2 restart vpn-panel-api

# Verify
curl http://localhost:3000/health
```

## 📱 Telegram Bot

```bash
# Test bot
curl "https://api.telegram.org/bot<TOKEN>/getMe"

# Check bot in logs
pm2 logs vpn-panel-api | grep -i telegram

# Restart bot
pm2 restart vpn-panel-api
```

## 💳 Tripay

```bash
# Test connection
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://tripay.co.id/api-sandbox/merchant/payment-channel

# Check callback URL in .env
grep TRIPAY_CALLBACK_URL .env

# View payment logs
sqlite3 data/panel.db "SELECT * FROM payments ORDER BY created_at DESC LIMIT 10;"
```

## 🔄 Backup & Restore

```bash
# Manual backup
tar -czf panel-backup-$(date +%Y%m%d).tar.gz data/ .env

# Restore
tar -xzf panel-backup-YYYYMMDD.tar.gz

# Database only
cp data/panel.db /backup/panel-$(date +%Y%m%d).db

# Automated backup script
cat > /root/backup-panel.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/panel-$(date +%Y%m%d_%H%M%S).tar.gz \
  -C /root/panel-ssh data/ .env
find $BACKUP_DIR -name "panel-*.tar.gz" -mtime +7 -delete
EOF

chmod +x /root/backup-panel.sh
(crontab -l; echo "0 2 * * * /root/backup-panel.sh") | crontab -
```

## 📈 Monitoring

```bash
# System resources
htop
free -h
df -h

# Service status
pm2 status
systemctl status vpn-panel-api

# Real-time logs
pm2 logs vpn-panel-api --lines 50

# Access logs
tail -f /var/log/nginx/access.log

# User statistics
sqlite3 data/panel.db << EOF
SELECT type, COUNT(*) as count FROM users GROUP BY type;
SELECT status, COUNT(*) as count FROM payments GROUP BY status;
EOF
```

## 🌐 Nginx

```bash
# Test config
nginx -t

# Reload
systemctl reload nginx

# Restart
systemctl restart nginx

# View logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# SSL certificate
certbot certificates
certbot renew --dry-run
```

## 📞 Quick Diagnostics

Run this diagnostic script:

```bash
#!/bin/bash
echo "=== VPN Panel API Diagnostics ==="
echo ""
echo "1. Service Status:"
pm2 list | grep vpn-panel-api || echo "Not running with PM2"
systemctl is-active vpn-panel-api || echo "Not running with systemd"
echo ""
echo "2. Health Check:"
curl -s http://localhost:3000/health | jq . || echo "Not responding"
echo ""
echo "3. Database:"
ls -lh data/panel.db
echo ""
echo "4. Port:"
netstat -tulpn | grep :3000 || echo "Port 3000 not in use"
echo ""
echo "5. Environment:"
grep -E "^(PORT|DOMAIN|NODE_ENV)=" .env
echo ""
echo "6. Recent Logs:"
pm2 logs vpn-panel-api --lines 5 --nostream
echo ""
echo "7. User Count:"
sqlite3 data/panel.db "SELECT COUNT(*) FROM users;"
echo ""
echo "8. Payment Count:"
sqlite3 data/panel.db "SELECT COUNT(*) FROM payments;"
```

## 🎯 Common Tasks

### Add Manual User

```bash
# SSH
curl -X POST http://localhost:3000/api/users \
  -H "X-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "type": "ssh",
    "password": "SecurePass123",
    "days": 30
  }'

# VLESS
curl -X POST http://localhost:3000/api/users \
  -H "X-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "type": "vless",
    "days": 30
  }'
```

### Check User Expiration

```bash
sqlite3 data/panel.db << EOF
SELECT username, type, 
       datetime(expires_at) as expires,
       CASE 
         WHEN datetime(expires_at) > datetime('now') THEN 'Active'
         ELSE 'Expired'
       END as status
FROM users
ORDER BY expires_at;
EOF
```

### View Recent Payments

```bash
sqlite3 data/panel.db << EOF
SELECT 
  invoice_id,
  service_type,
  amount,
  status,
  datetime(created_at) as created,
  datetime(paid_at) as paid
FROM payments
ORDER BY created_at DESC
LIMIT 10;
EOF
```

### Clean Expired Users (Manual)

```bash
# List expired users
sqlite3 data/panel.db "SELECT id, username, type FROM users WHERE datetime(expires_at) < datetime('now');"

# Delete specific user via API
curl -X DELETE http://localhost:3000/api/users/1 \
  -H "X-API-KEY: $API_KEY"
```

## 📚 Resources

- Full Documentation: `README.md`
- API Examples: `API_EXAMPLES.md`
- Deployment Guide: `DEPLOYMENT.md`
- Service File: `vpn-panel-api.service`
- Test Script: `test-api.sh`

## ⚡ Emergency Commands

```bash
# Stop everything
pm2 stop all
systemctl stop vpn-panel-api nginx

# Kill process on port
kill -9 $(lsof -t -i:3000)

# Reset database
rm data/panel.db && npm run migrate

# Restore from backup
cp /backup/panel.db data/panel.db
pm2 restart vpn-panel-api

# Check disk space
df -h

# Check memory
free -h

# Restart server (last resort)
reboot
```

## 🔗 Useful Links

- Tripay Dashboard: https://tripay.co.id/member
- Tripay Docs: https://tripay.co.id/developer
- Node.js Docs: https://nodejs.org/docs
- PM2 Docs: https://pm2.keymetrics.io/docs
- SQLite Docs: https://www.sqlite.org/docs.html

---

**Last Updated:** $(date)

**Version:** 1.0.0
