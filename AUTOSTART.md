# Auto-Start Configuration

Your YoyoPod Dashboard is now configured to start automatically after your Raspberry Pi reboots! 🎉

## What Was Set Up

1. **PM2 Process Manager**: Installed globally to manage your Node.js application
2. **Systemd Service**: Created `pm2-raouf.service` that starts PM2 on boot
3. **Saved Process List**: Your dashboard application is saved in PM2's process list

## How It Works

- When your Pi boots up, the `pm2-raouf` systemd service starts automatically
- PM2 resurrects the saved process list, which includes your dashboard
- Your dashboard will be running on port 3000 (as configured in `ecosystem.config.cjs`)



## Useful Commands

### Check Application Status
```bash
pm2 status
```

### View Application Logs
```bash
pm2 logs yoyopod-dashboard
pm2 logs yoyopod-dashboard --lines 100  # Show last 100 lines
```

### Monitor Application (Real-time)
```bash
pm2 monit
```

### Restart Application
```bash
pm2 restart yoyopod-dashboard
```

### Stop Application
```bash
pm2 stop yoyopod-dashboard
```

### Start Application (if stopped)
```bash
pm2 start yoyopod-dashboard
```

### View More Details
```bash
pm2 show yoyopod-dashboard
```

## Configuration Files

- **PM2 Config**: `ecosystem.config.cjs`
- **Systemd Service**: `/etc/systemd/system/pm2-raouf.service`
- **PM2 Process List**: `~/.pm2/dump.pm2`
- **Logs Location**: `./logs/error.log` and `./logs/output.log`

## Testing the Auto-Start

To test if auto-start works, you can reboot your Pi:
```bash
sudo reboot
```

After the Pi reboots, SSH back in and check:
```bash
pm2 status
```

You should see your dashboard running!

## Troubleshooting

### Dashboard not running after reboot
```bash
# Check if PM2 service is running
systemctl status pm2-raouf.service

# Check PM2 logs
pm2 logs yoyopod-dashboard --err
```

### Manually start if needed
```bash
cd /home/raouf/yoyo/yoy_dash
pm2 start ecosystem.config.cjs
pm2 save
```

## Removing Auto-Start

If you ever want to disable auto-start:
```bash
pm2 unstartup systemd
pm2 delete yoyopod-dashboard
```

## Notes

- The application will automatically restart if it crashes (configured in `ecosystem.config.cjs`)
- Maximum memory limit is set to 200MB
- Logs are automatically rotated and timestamped



