# YoyoPod Dashboard Deployment Guide

## System Requirements

### Hardware
- **Device:** Raspberry Pi Zero 2 W (minimum)
- **RAM:** 512MB minimum
- **Storage:** 4GB minimum (8GB recommended)
- **Network:** WiFi or Ethernet connection

### Software
- **OS:** Raspberry Pi OS (Lite or Desktop)
- **Node.js:** Version 20.x or higher
- **Package Manager:** pnpm (installed automatically)

## Installation Steps

### 1. Prepare the Raspberry Pi

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required system packages
sudo apt install -y git openssl sqlite3
```

### 2. Install Node.js

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
```

### 3. Clone and Setup

```bash
# Clone the repository (or copy files to the Pi)
cd /home/pi
# If you have the files locally, skip git clone

# Navigate to project directory
cd yoyopod-dashboard

# Run setup script
chmod +x scripts/*.sh
./scripts/setup.sh
```

### 4. Configure Environment

```bash
# Edit .env file
nano .env

# Update these values:
# - SESSION_SECRET (generate a random 32+ character string)
# - SERVICE_BASE_URL (URL of your device services)
# - SERVICE_TOKEN (shared secret with device services)
```

### 5. Start the Dashboard

```bash
# Start the dashboard
./scripts/start.sh

# The dashboard will be available at:
# https://localhost:3000
```

## Network Configuration

### Access from Mobile Device

1. Find the Pi's IP address:
```bash
hostname -I
```

2. Access from mobile browser:
```
https://192.168.1.XXX:3000
```

3. Accept the self-signed SSL certificate warning

### Static IP Configuration

For reliable access, configure a static IP:

```bash
# Edit dhcpcd.conf
sudo nano /etc/dhcpcd.conf

# Add at the end:
interface wlan0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

## Auto-Start on Boot

```bash
# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup

# Run the command that PM2 outputs (it will be specific to your system)
# Example:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u pi --hp /home/pi

# Test by rebooting
sudo reboot
```

## Monitoring

### View Logs

```bash
# View dashboard logs
pm2 logs yoyopod-dashboard

# View only error logs
pm2 logs yoyopod-dashboard --err

# Clear logs
pm2 flush
```

### Check Status

```bash
# PM2 status
pm2 status

# Detailed info
pm2 info yoyopod-dashboard

# Run health check
./scripts/health-check.sh
```

### Resource Monitoring

```bash
# PM2 monitoring
pm2 monit

# System resources
htop
```

## Updates and Maintenance

### Update Dashboard

```bash
# Stop dashboard
pm2 stop yoyopod-dashboard

# Pull latest code (if using git)
git pull

# Install dependencies
pnpm install

# Run migrations
./scripts/migrate.sh

# Rebuild
pnpm build

# Restart
pm2 restart yoyopod-dashboard
```

### Database Backup

```bash
# Backup database
cp prisma/yoyopod.db prisma/yoyopod.db.backup-$(date +%Y%m%d)

# Restore from backup
cp prisma/yoyopod.db.backup-YYYYMMDD prisma/yoyopod.db
```

### Log Rotation

Logs are automatically rotated by PM2. Configure in `ecosystem.config.js`:

```javascript
{
  max_size: '10M',
  max_files: 10,
  compress: true
}
```

## Troubleshooting

### Dashboard Won't Start

1. Check Node.js version:
```bash
node --version  # Should be 20.x
```

2. Check build exists:
```bash
ls -la build/
```

3. Check logs:
```bash
pm2 logs yoyopod-dashboard
cat logs/error.log
```

### Port 3000 Already in Use

```bash
# Find what's using the port
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>
```

### Database Locked

```bash
# Stop dashboard
pm2 stop yoyopod-dashboard

# Check for stale connections
fuser prisma/yoyopod.db

# Restart
pm2 restart yoyopod-dashboard
```

### SSL Certificate Issues

```bash
# Regenerate certificate
cd ssl
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=yoyopod.local"
```

### Out of Memory

If the Pi runs out of memory:

1. Increase swap:
```bash
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Change CONF_SWAPSIZE=100 to CONF_SWAPSIZE=512
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

2. Reduce memory usage in ecosystem.config.js:
```javascript
max_memory_restart: '150M'  // Reduce from 200M
```

## Performance Optimization

### For Raspberry Pi Zero 2 W

1. Disable unnecessary services:
```bash
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon
```

2. Optimize Node.js:
```bash
# In .env
NODE_OPTIONS="--max-old-space-size=256"
```

3. Enable gzip compression (already enabled in Remix)

4. Use process monitoring:
```bash
# Monitor performance
pm2 monit
```

## Security Hardening

1. Change default password immediately after first login

2. Use a strong SESSION_SECRET:
```bash
# Generate random secret
openssl rand -base64 32
```

3. Keep system updated:
```bash
sudo apt update && sudo apt upgrade -y
```

4. Configure firewall:
```bash
sudo apt install ufw
sudo ufw allow 22
sudo ufw allow 3000
sudo ufw enable
```

## Production Checklist

- [ ] Change default password
- [ ] Configure static IP
- [ ] Setup auto-start on boot
- [ ] Configure firewall
- [ ] Setup log rotation
- [ ] Configure database backups
- [ ] Test health check endpoint
- [ ] Verify mobile access
- [ ] Document custom configuration
- [ ] Test factory reset procedure

## Support

For deployment issues:
1. Check logs: `pm2 logs yoyopod-dashboard`
2. Run health check: `./scripts/health-check.sh`
3. Review documentation
4. Contact support team

