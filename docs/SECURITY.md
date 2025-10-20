# YoyoPod Dashboard Security Guidelines

## Security Overview

The YoyoPod Dashboard implements multiple layers of security to protect your child's device and data.

## Authentication & Authorization

### Password Requirements

- **Minimum Length:** 8 characters
- **Complexity:** Must contain:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
- **Forbidden:** Common passwords like "password", "admin", "12345678"

### Session Management

- **Cookie-based sessions** with secure flags
- **Session expiry:** 7 days
- **Auto-logout:** 30 minutes of inactivity
- **httpOnly flag:** Prevents XSS attacks
- **Secure flag:** HTTPS only (production)
- **SameSite flag:** Prevents CSRF attacks

### Rate Limiting

- **Login attempts:** Maximum 5 attempts per 15 minutes
- **Automatic lockout:** Temporary ban after failed attempts
- **IP-based tracking:** Logs all authentication attempts

## Data Protection

### Local Storage Only

- **No cloud sync:** All data stays on the device
- **SQLite database:** Local file-based storage
- **No external APIs:** Except configured device services
- **GDPR compliant:** User has full control over data

### Encryption

- **Passwords:** bcrypt hashing with 10 rounds
- **Session tokens:** Cryptographically secure random tokens
- **SSL/TLS:** HTTPS for all communications

### Database Security

```javascript
// Prisma ORM prevents SQL injection
prisma.user.findUnique({
  where: { username: sanitizedInput }  // ✓ Safe
});

// Never use raw SQL with user input
// prisma.$queryRaw`SELECT * FROM users WHERE username = ${userInput}`  // ✗ Unsafe
```

## Network Security

### HTTPS Configuration

The dashboard generates a self-signed SSL certificate on first run:

```bash
openssl req -x509 -newkey rsa:4096 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -days 365 -nodes \
  -subj "/CN=yoyopod.local"
```

**Production Note:** Replace with a valid certificate from Let's Encrypt for external access.

### Firewall Configuration

Recommended UFW rules:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 3000/tcp    # Dashboard
sudo ufw enable
```

### Service Token

Communications between dashboard and device services use a shared secret token:

```bash
# In .env
SERVICE_TOKEN=your-secure-random-token-here

# Generate secure token:
openssl rand -hex 32
```

## Input Validation

### Zod Schema Validation

All form inputs are validated server-side:

```typescript
const schema = z.object({
  deviceName: z.string().min(1).max(50),
  maxVolume: z.number().min(0).max(100),
  // ...
});

const result = schema.safeParse(userInput);
```

### Sanitization

- **HTML escaping:** React automatically escapes output
- **URL validation:** Strict regex patterns
- **Phone numbers:** Validated format
- **Time inputs:** HH:mm format validation

## Audit Logging

### What's Logged

- User login/logout events
- Settings changes
- Password changes
- WiFi configuration
- Contact management
- Factory reset requests

### Log Format

```typescript
{
  userId: "user-id",
  action: "settings_changed",
  details: { /* sanitized change details */ },
  ipAddress: "192.168.1.100",
  timestamp: "2024-01-01T12:00:00Z"
}
```

### Log Retention

- **Storage:** SQLite database
- **Rotation:** Automatic via Winston
- **Access:** Admin only
- **Cleanup:** Manual purge of old logs

## Privacy Compliance

### COPPA (Children's Online Privacy Protection Act)

- **No data collection** without parental consent
- **Parental controls** for all features
- **Local storage only** - no third-party sharing
- **Transparent privacy policy** in license agreement

### GDPR (General Data Protection Regulation)

Users have the right to:

1. **Access:** View all stored data via dashboard
2. **Rectify:** Edit any incorrect information
3. **Erase:** Factory reset removes all data
4. **Export:** Database backup contains all data
5. **Object:** Disable any tracking features

### Data Minimization

Only essential data is collected:

- User credentials (parent only)
- Device settings
- Contacts (for VoIP variant)
- Location history (if enabled)
- Usage logs (for reports)

**NOT collected:**
- Child's personal information
- Browsing history
- Voice recordings (unless AI variant with logging enabled)
- Payment information
- Analytics/telemetry

## Secure Defaults

### Out-of-the-Box Security

```typescript
{
  mustChangePassword: true,        // Force password change
  contentFilterEnabled: true,      // Enable content filter
  explicitContentBlocked: true,    // Block explicit content
  locationEnabled: false,          // Location off by default
  conversationLogging: true        // AI conversations logged for review
}
```

### Least Privilege

- **Single user:** Only parent account
- **No remote access:** Local network only (default)
- **No guest access:** Authentication required
- **Session-based:** No persistent tokens

## Vulnerability Reporting

### Security Issues

If you discover a security vulnerability:

1. **Do NOT** create a public GitHub issue
2. Email: security@yoyopod.com
3. Provide:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Acknowledgment:** Within 24 hours
- **Assessment:** Within 7 days
- **Fix:** Based on severity (critical: 48 hours)
- **Disclosure:** After fix is deployed

## Security Checklist

### Initial Setup
- [ ] Change default password immediately
- [ ] Generate strong SESSION_SECRET
- [ ] Configure SERVICE_TOKEN
- [ ] Enable firewall
- [ ] Review default settings
- [ ] Test HTTPS certificate

### Regular Maintenance
- [ ] Keep Node.js updated
- [ ] Update dependencies monthly
- [ ] Review audit logs weekly
- [ ] Backup database regularly
- [ ] Monitor failed login attempts
- [ ] Check system resources

### Incident Response
- [ ] Document security incident
- [ ] Isolate affected system
- [ ] Review audit logs
- [ ] Change credentials
- [ ] Update firmware/software
- [ ] Notify affected users

## Security Best Practices

### For Parents

1. **Strong Password:** Use a unique, complex password
2. **Regular Updates:** Install updates promptly
3. **Supervised Setup:** Configure device with child
4. **Review Logs:** Check activity reports regularly
5. **Secure Network:** Use WPA2/WPA3 WiFi
6. **Physical Security:** Keep device safe from tampering

### For Developers

1. **Code Review:** All changes reviewed
2. **Dependency Scanning:** Use `npm audit`
3. **Input Validation:** Server-side only
4. **Error Handling:** No sensitive data in errors
5. **Logging:** Sanitize before logging
6. **Testing:** Security tests in CI/CD

## Known Limitations

1. **Self-signed Certificate:** Browser warnings on first access
2. **Local Network Only:** No remote access by default
3. **Single User:** No multi-parent support
4. **No 2FA:** Single password authentication
5. **SQLite:** File-based database (not clustered)

## Security Updates

Subscribe to security updates:
- GitHub Releases (watch repository)
- Security mailing list: security@yoyopod.com

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Remix Security](https://remix.run/docs/en/main/guides/security)
- [COPPA Compliance](https://www.ftc.gov/enforcement/rules/rulemaking-regulatory-reform-proceedings/childrens-online-privacy-protection-rule)
- [GDPR Guide](https://gdpr.eu/)

