# Deployment Guide

Panduan lengkap untuk deploy VPN Panel API ke production server.

## 📋 Prerequisites

- VPS dengan Ubuntu 20.04+ atau Debian 11+
- Root access
- Domain dengan SSL certificate
- Port 3000 available (atau custom port)
- Existing SSH/Xray setup (dari install.sh)

## 🚀 Quick Deployment

### 1. Clone Repository

```bash
cd /root
git clone https://github.com/julfryantomanurung/panel-ssh.git
cd panel-ssh
```

### 2. Run Setup Script

```bash
chmod +x setup.sh
./setup.sh
```

Script ini akan:
- Install Node.js (jika belum)
- Install dependencies
- Create .env file dengan random API key
- Initialize database

### 3. Configure Environment

Edit `.env` file:

```bash
nano .env
```

Update minimal konfigurasi ini:

```env
# Your domain
DOMAIN=yourdomain.com

# Tripay credentials (get from https://tripay.co.id)
TRIPAY_API_KEY=your-actual-api-key
TRIPAY_PRIVATE_KEY=your-actual-private-key
TRIPAY_MERCHANT_CODE=your-merchant-code
TRIPAY_MODE=production

# Telegram Bot (get from @BotFather)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_ADMIN_ID=your-telegram-username

# Pricing (in IDR)
PRICE_SSH_30DAYS=10000
PRICE_VLESS_30DAYS=15000
PRICE_VMESS_30DAYS=15000
PRICE_TROJAN_30DAYS=15000
```

### 4. Start Service

#### Option A: Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start service
pm2 start src/server.js --name vpn-panel-api

# Enable startup on boot
pm2 startup
pm2 save

# Check status
pm2 status

# View logs
pm2 logs vpn-panel-api
```

#### Option B: Using Systemd

```bash
# Copy service file
cp vpn-panel-api.service /etc/systemd/system/

# Edit WorkingDirectory if needed
nano /etc/systemd/system/vpn-panel-api.service

# Reload systemd
systemctl daemon-reload

# Enable and start
systemctl enable vpn-panel-api
systemctl start vpn-panel-api

# Check status
systemctl status vpn-panel-api

# View logs
journalctl -u vpn-panel-api -f
```

### 5. Setup Nginx Reverse Proxy

Create Nginx config:

```bash
nano /etc/nginx/sites-available/vpn-panel-api
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration (adjust paths to your SSL certificates)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # API endpoints
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }

    # Root endpoint
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable the site:

```bash
# Create symlink
ln -s /etc/nginx/sites-available/vpn-panel-api /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

### 6. Setup SSL Certificate (if not already)

Using Certbot:

```bash
# Install Certbot
apt-get install -y certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d yourdomain.com

# Test auto-renewal
certbot renew --dry-run
```

### 7. Configure Firewall

```bash
# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# If accessing API directly (optional)
ufw allow 3000/tcp

# Enable firewall
ufw enable
```

### 8. Test Deployment

```bash
# Test health endpoint
curl https://yourdomain.com/health

# Test API (replace with your API key)
curl https://yourdomain.com/api/users \
  -H "X-API-KEY: your-api-key"
```

## 🔧 Configuration Tips

### Tripay Setup

1. Register at https://tripay.co.id
2. Get API credentials from dashboard
3. Set callback URL to: `https://yourdomain.com/api/payments/callback`
4. Whitelist your server IP
5. Start with sandbox mode for testing

### Telegram Bot Setup

1. Chat with @BotFather
2. Create new bot: `/newbot`
3. Get token
4. Set bot commands:
```
/start - Start bot
```
5. Test bot before going live

### Database Backup

Setup automatic backup:

```bash
# Create backup script
cat > /root/backup-vpn-panel.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp /root/panel-ssh/data/panel.db $BACKUP_DIR/panel_$DATE.db
# Keep only last 7 days
find $BACKUP_DIR -name "panel_*.db" -mtime +7 -delete
EOF

chmod +x /root/backup-vpn-panel.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-vpn-panel.sh") | crontab -
```

## 📊 Monitoring

### View Logs

PM2:
```bash
pm2 logs vpn-panel-api
pm2 logs vpn-panel-api --lines 100
```

Systemd:
```bash
journalctl -u vpn-panel-api -f
journalctl -u vpn-panel-api --since today
```

### Monitor Performance

```bash
# PM2 monitoring
pm2 monit

# System resources
htop

# Nginx access logs
tail -f /var/log/nginx/access.log

# Nginx error logs
tail -f /var/log/nginx/error.log
```

### Database Query

```bash
# Access database
sqlite3 /root/panel-ssh/data/panel.db

# Common queries
sqlite> SELECT * FROM users LIMIT 10;
sqlite> SELECT * FROM payments WHERE status='PAID';
sqlite> SELECT COUNT(*) FROM users;
sqlite> .quit
```

## 🔄 Updates

### Update Application

```bash
cd /root/panel-ssh

# Backup database first
cp data/panel.db data/panel.db.backup

# Pull latest changes
git pull

# Install new dependencies
npm install

# Restart service
pm2 restart vpn-panel-api
# OR
systemctl restart vpn-panel-api

# Check status
pm2 status
# OR
systemctl status vpn-panel-api
```

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check logs
pm2 logs vpn-panel-api --err
# OR
journalctl -u vpn-panel-api -n 50

# Check environment
cat .env

# Check Node.js
node --version
npm --version

# Test manually
cd /root/panel-ssh
node src/server.js
```

### Database Issues

```bash
# Check database exists
ls -l data/panel.db

# Re-initialize
rm data/panel.db
npm run migrate

# Check permissions
chmod 644 data/panel.db
```

### Nginx Issues

```bash
# Test configuration
nginx -t

# Check error logs
tail -f /var/log/nginx/error.log

# Restart Nginx
systemctl restart nginx
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000
# OR
netstat -tulpn | grep 3000

# Kill process
kill -9 <PID>

# Change port in .env
nano .env
# Change PORT=3000 to PORT=3001
```

### Tripay Callback Not Working

1. Check callback URL in Tripay dashboard
2. Verify server IP is whitelisted
3. Test callback endpoint:
```bash
curl -X POST https://yourdomain.com/api/payments/callback \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```
4. Check logs for callback requests

### Telegram Bot Not Responding

```bash
# Test bot token
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"

# Check if bot is running
pm2 list
ps aux | grep node

# Restart service
pm2 restart vpn-panel-api
```

## 🔐 Security Checklist

- [ ] Change default API key
- [ ] Use strong passwords
- [ ] Enable firewall (ufw)
- [ ] Setup SSL/HTTPS
- [ ] Regular database backups
- [ ] Monitor logs regularly
- [ ] Keep Node.js updated
- [ ] Update dependencies regularly
- [ ] Whitelist Tripay IPs (if possible)
- [ ] Use environment variables for secrets
- [ ] Don't commit .env to git
- [ ] Limit API rate limiting if needed
- [ ] Monitor for suspicious activity

## 📈 Performance Optimization

### Node.js

```bash
# Use PM2 cluster mode
pm2 start src/server.js -i max --name vpn-panel-api

# Or specific number of instances
pm2 start src/server.js -i 4 --name vpn-panel-api
```

### Database

```bash
# Regular vacuum
sqlite3 data/panel.db "VACUUM;"

# Add to cron (monthly)
(crontab -l; echo "0 0 1 * * sqlite3 /root/panel-ssh/data/panel.db 'VACUUM;'") | crontab -
```

### Nginx

Add caching in Nginx config:

```nginx
# Cache zone
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m;

# In location block
proxy_cache api_cache;
proxy_cache_valid 200 5m;
proxy_cache_methods GET HEAD;
```

## 📞 Support

For issues:
1. Check logs first
2. Review documentation
3. Search existing issues
4. Create new issue with details

## 📝 Changelog

Keep track of deployments:

```bash
# Create deployment log
echo "$(date): Deployed version $(git describe --always)" >> /root/panel-ssh/deployment.log
```

## ✅ Post-Deployment Checklist

- [ ] Service is running
- [ ] Health endpoint responds
- [ ] API endpoints work with authentication
- [ ] Database is accessible
- [ ] Nginx reverse proxy working
- [ ] SSL certificate valid
- [ ] Telegram bot responds
- [ ] Tripay credentials configured
- [ ] Backup script configured
- [ ] Monitoring setup
- [ ] Firewall configured
- [ ] Logs are accessible
- [ ] Documentation updated
- [ ] Team notified

---

**Deployment Date:** _______________

**Deployed By:** _______________

**Version:** _______________

**Notes:** _______________
