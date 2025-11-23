# Security Policy

## Overview

This document outlines the security measures implemented in the VPN Panel API and provides guidance for secure deployment and operation.

## Security Features

### 1. Authentication & Authorization

#### API Key Authentication
- All API endpoints (except webhook) require `X-API-KEY` header
- API keys should be generated using strong random methods
- Keys are validated on every request
- Invalid keys result in 403 Forbidden response

**Recommendation**: Generate API key using:
```bash
openssl rand -hex 32
```

### 2. Input Validation

#### Username Validation
- Pattern: `^[a-zA-Z0-9_]+$` (alphanumeric and underscore only)
- Prevents command injection attacks
- Applied to all user creation and deletion operations

#### Password Requirements
- Minimum length: 6 characters (configurable)
- Required for SSH service type
- Not logged in activity logs

#### Service Type Validation
- Only allowed types: ssh, vless, vmess, trojan
- Invalid types are rejected with 400 Bad Request

### 3. Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- Applied to all `/api/*` endpoints
- Configurable in `src/server.js`
- Returns 429 Too Many Requests when exceeded

**Production Recommendation**: Adjust based on expected traffic:
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100  // Adjust this value
});
```

### 4. Activity Logging

All API actions are logged to the database with:
- Action type
- Timestamp
- IP address
- User/Payment ID (when applicable)
- Request details (sanitized)

#### Sensitive Data Redaction

The following fields are automatically redacted from logs:
- password
- api_key
- token
- secret
- private_key

### 5. Command Injection Prevention

#### SSH User Operations
- Username validation before any system command
- Password passed via stdin (not command substitution)
- No user-controlled data in command strings

#### Xray Configuration
- File operations use atomic writes
- Configuration backup before modifications
- JSON parsing with error handling

### 6. HTTPS/TLS

**Production Requirement**: Always use HTTPS in production

Setup with Let's Encrypt:
```bash
certbot --nginx -d yourdomain.com
```

### 7. HTTP Security Headers

Implemented via Helmet.js:
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- X-XSS-Protection
- Content-Security-Policy

### 8. CORS Configuration

- Configurable CORS policy
- Can be restricted to specific origins in production

**Production Recommendation**:
```javascript
app.use(cors({
  origin: 'https://yourdomain.com',
  credentials: true
}));
```

## Known Limitations

### 1. Root Privileges Required

The service requires root privileges for:
- SSH user creation (`useradd`, `chpasswd`)
- Xray configuration modification
- Service restart operations

**Mitigation**: 
- Run service in isolated environment
- Use AppArmor or SELinux profiles
- Monitor system logs regularly

### 2. Temporary Password Storage

Passwords are temporarily stored in the database during payment processing.

**Current Implementation**:
- Stored in `merchant_ref` field as JSON
- Cleared after user creation
- Not included in activity logs

**Production Recommendation**:
- Implement encryption for temporary storage
- Use environment-specific encryption keys
- Consider using separate secure storage (Redis with encryption)

### 3. SQLite Limitations

SQLite is used for simplicity but has limitations:
- No built-in encryption
- Limited concurrent writes
- Single file vulnerability

**Production Recommendation**:
- Migrate to PostgreSQL or MySQL for production
- Enable database-level encryption
- Implement regular backups
- Use database access controls

## Threat Model

### Threats Addressed

1. ✅ **API Key Theft**: Keys validated on every request
2. ✅ **Command Injection**: Input validation and safe command execution
3. ✅ **SQL Injection**: Parameterized queries used throughout
4. ✅ **XSS Attacks**: HTTP security headers enabled
5. ✅ **Rate Limiting Bypass**: IP-based rate limiting
6. ✅ **Sensitive Data Exposure**: Automatic log sanitization
7. ✅ **CSRF**: API-only design, no session cookies

### Residual Risks

1. ⚠️ **Root Privilege Escalation**: Service runs as root (required)
2. ⚠️ **Database Access**: No encryption at rest (SQLite limitation)
3. ⚠️ **Temporary Password Storage**: Plaintext during payment flow
4. ⚠️ **DDoS Attacks**: Basic rate limiting only

## Best Practices

### 1. API Key Management

```bash
# Generate strong API key
openssl rand -hex 32 > .api_key

# Set in environment
export API_KEY=$(cat .api_key)

# Rotate regularly (quarterly recommended)
```

### 2. Access Control

```bash
# Restrict file permissions
chmod 600 .env
chmod 600 data/*.db

# Set up firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 3. Monitoring

```bash
# Monitor failed authentication attempts
sqlite3 data/panel.db "SELECT * FROM activity_logs WHERE details LIKE '%401%' OR details LIKE '%403%';"

# Check for suspicious activity
tail -f /var/log/syslog | grep vpn-panel-api

# Monitor resource usage
pm2 monit
```

### 4. Regular Updates

```bash
# Check for security updates
npm audit

# Update dependencies
npm update

# Check Node.js version
node --version  # Should be LTS version
```

### 5. Backup Strategy

```bash
# Daily database backup
0 2 * * * cp /root/panel-ssh/data/panel.db /backup/panel-$(date +\%Y\%m\%d).db

# Weekly full backup
0 3 * * 0 tar -czf /backup/panel-full-$(date +\%Y\%m\%d).tar.gz /root/panel-ssh

# Keep backups for 30 days
find /backup -name "panel-*.db" -mtime +30 -delete
```

### 6. Incident Response

In case of security incident:

1. **Immediate Actions**:
   ```bash
   # Stop service
   pm2 stop vpn-panel-api
   
   # Block suspicious IPs
   ufw deny from <IP_ADDRESS>
   
   # Review logs
   pm2 logs vpn-panel-api --lines 1000
   sqlite3 data/panel.db "SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100;"
   ```

2. **Investigation**:
   - Check activity logs for unauthorized access
   - Review user creation/deletion history
   - Analyze payment transactions
   - Check system logs for privilege escalation

3. **Recovery**:
   - Rotate API keys immediately
   - Update all credentials
   - Restore from backup if compromised
   - Patch vulnerabilities
   - Restart service

## Security Checklist

### Pre-deployment

- [ ] Generate strong, unique API key
- [ ] Configure environment variables securely
- [ ] Set up HTTPS/TLS certificate
- [ ] Configure firewall rules
- [ ] Set proper file permissions (600 for .env, database)
- [ ] Review and customize rate limits
- [ ] Set up monitoring and alerting
- [ ] Configure log rotation
- [ ] Set up automated backups
- [ ] Document incident response procedures

### Post-deployment

- [ ] Test API key authentication
- [ ] Verify HTTPS is working
- [ ] Test rate limiting
- [ ] Check activity logs are being recorded
- [ ] Verify backups are running
- [ ] Monitor for security updates
- [ ] Review logs regularly
- [ ] Test incident response procedures

### Regular Maintenance

- [ ] Rotate API keys (quarterly)
- [ ] Update dependencies (monthly)
- [ ] Review activity logs (weekly)
- [ ] Check disk space (daily)
- [ ] Test backups (monthly)
- [ ] Security audit (annually)

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. Email details to the repository maintainer
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Compliance Notes

### Data Protection

- User passwords are handled with care
- Activity logs include IP addresses (consider GDPR/privacy laws)
- Payment data should comply with PCI DSS if applicable
- User data retention policy should be defined

### Audit Trail

- All API actions are logged
- Logs include timestamp, IP, action type
- Logs are retained in database
- Consider log retention policy for compliance

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [SQLite Security](https://www.sqlite.org/security.html)

## Version History

- **v1.0.0** (2024): Initial security implementation
  - API key authentication
  - Rate limiting
  - Input validation
  - Activity logging
  - Command injection prevention
  - Sensitive data redaction

---

**Last Updated**: 2024-11-23

**Security Contact**: [Repository Maintainer]
