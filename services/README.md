# Services Directory

This directory contains background services that run alongside the YoyoPod dashboard.

## Mock Battery Service

The mock battery service simulates a real battery with I2C fuel gauge by providing realistic battery data to the dashboard.

### Quick Start

**Development (standalone)**:
```bash
npm run battery:mock
```

**Production (with PM2)**:
```bash
pm2 start ecosystem.config.cjs
```

### Check Battery Status

```bash
npm run battery:status
```

### Manual Control

```bash
# Toggle charging/discharging
pm2 trigger mock-battery-service SIGUSR1

# Reset to default (85%, discharging)
pm2 trigger mock-battery-service SIGUSR2
```

Or using kill command:
```bash
# Get process ID
pm2 list

# Toggle charging
kill -USR1 <pid>

# Reset
kill -USR2 <pid>
```

### Configuration

Edit `ecosystem.config.cjs` to adjust:
- `BATTERY_UPDATE_INTERVAL`: How often to update (default: 30000ms)
- `DISCHARGE_RATE`: Battery drain rate in % per minute (default: 0.5)
- `CHARGE_RATE`: Battery charge rate in % per minute (default: 1.0)

### Migration to Real Hardware

When you have real I2C fuel gauge hardware:

1. Create `i2c-battery-service.ts` following the same `BatteryData` interface
2. Update `ecosystem.config.cjs` to use the new service
3. Dashboard code requires **NO changes** - it already reads from `/run/yoyo/battery.json`

See `docs/BATTERY_SERVICE.md` for detailed documentation and I2C integration examples.

