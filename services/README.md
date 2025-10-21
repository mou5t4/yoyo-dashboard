# Services Directory

This directory contains background services that run alongside the YoyoPod dashboard.

## Available Services

1. **Mock Battery Service** - Simulates battery with I2C fuel gauge
2. **Mock GPS Service** - Simulates GPS location with random walk

Both services follow the same pattern: read sensor → write to file → dashboard reads file.

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

## Mock GPS Service

The mock GPS service simulates a real GPS module by providing realistic location data with random walk movement.

### Quick Start

**Development (standalone)**:
```bash
npm run gps:mock
```

**Production (with PM2)**:
```bash
pm2 start ecosystem.config.cjs
```

### Check GPS Status

```bash
npm run gps:status
```

Or watch in real-time:
```bash
watch -n 1 cat /tmp/yoyo/location.json
```

### Manual Control

```bash
# Toggle GPS on/off (simulate signal loss)
pm2 trigger mock-gps-service SIGUSR1

# Reset to center location
pm2 trigger mock-gps-service SIGUSR2
```

Or using kill command:
```bash
# Get process ID
pm2 list

# Toggle GPS
kill -USR1 <pid>

# Reset to center
kill -USR2 <pid>
```

### Configuration

Edit `ecosystem.config.cjs` to adjust:
- `LOCATION_UPDATE_INTERVAL`: How often to update (default: 30000ms)
- `GPS_CENTER_LAT`: Center latitude for random walk (default: 37.7749)
- `GPS_CENTER_LON`: Center longitude for random walk (default: -122.4194)
- `GPS_WALK_RADIUS`: Movement radius in meters (default: 500m)

### Simulation Behavior

- **Random walk**: Moves randomly around center point
- **GPS drift**: Accuracy varies 5-50 meters
- **Speed/Heading**: Calculated from movement
- **Satellites**: Varies 6-12 satellites
- **Altitude**: Small variations around 15m

### Migration to Real Hardware

When you have real GPS hardware:

1. Install gpsd: `sudo apt-get install gpsd gpsd-clients`
2. Configure gpsd with your GPS device path
3. Create `gpsd-location-service.ts` or `serial-gps-service.ts` following the `LocationData` interface
4. Update `ecosystem.config.cjs` to use the new service
5. Dashboard code requires **NO changes** - it already reads from `/tmp/yoyo/location.json`

See `docs/LOCATION_SERVICE.md` for detailed documentation, GPS hardware integration, and code examples.

## Running All Services

To run all services together (recommended for production):

```bash
# Start all services with PM2
pm2 start ecosystem.config.cjs

# View status
pm2 list

# View logs
pm2 logs

# Stop all
pm2 stop all

# Restart all
pm2 restart all
```

## Service Architecture

All services follow the same pattern:

```
Sensor/Mock → Service Process → JSON File → Dashboard
```

Benefits:
- **Decoupled**: Services run independently of dashboard
- **Resilient**: Dashboard continues working if service temporarily fails
- **Simple**: Just JSON files, no complex IPC
- **Debuggable**: Easy to inspect with `cat` or `jq`
- **Replaceable**: Swap mock for real without changing dashboard code

