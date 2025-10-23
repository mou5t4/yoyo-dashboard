# Battery Service Documentation

## Overview

The YoyoPod dashboard integrates with a battery monitoring service that provides real-time battery information. This document explains how the battery service works, how to use the mock service for development, and how to integrate with real I2C fuel gauge hardware.

## Architecture

### Data Flow

```
┌─────────────────────────────┐
│  I2C Fuel Gauge (Hardware)  │
│  or Mock Simulator          │
└──────────┬──────────────────┘
           │ Reads every 30s
           ▼
┌─────────────────────────────┐
│  Battery Service Process    │
│  (mock-battery-service.ts   │
│   or i2c-battery-service.ts)│
└──────────┬──────────────────┘
           │ Writes atomically
           ▼
┌─────────────────────────────┐
│  /run/yoyo/battery.json     │
│  (tmpfs - RAM filesystem)   │
└──────────┬──────────────────┘
           │ Reads on-demand
           ▼
┌─────────────────────────────┐
│  Dashboard Backend          │
│  (device.service.server.ts) │
└──────────┬──────────────────┘
           │ API Response
           ▼
┌─────────────────────────────┐
│  Dashboard Frontend         │
│  (Battery UI Components)    │
└─────────────────────────────┘
```

### Why `/run/yoyo/battery.json`?

- **RAM-based**: `/run` is a tmpfs filesystem mounted in RAM
- **Zero disk writes**: No wear on SD card or SSD
- **Fast reads**: Memory access is instant
- **Power efficient**: No disk I/O overhead
- **Standard pattern**: Common in embedded Linux systems

## Battery Data Format

### BatteryData Interface

```typescript
interface BatteryData {
  capacity: number;        // Battery level 0-100%
  voltage: number;         // Voltage in volts (e.g., 4.2V)
  current: number;         // Current in mA (+ = charging, - = discharging)
  status: 'charging' | 'discharging' | 'full' | 'unknown';
  temperature: number;     // Temperature in Celsius
  timestamp: number;       // Unix timestamp (milliseconds)
}
```

### Example JSON File

```json
{
  "capacity": 85.0,
  "voltage": 3.95,
  "current": -200,
  "status": "discharging",
  "temperature": 28.5,
  "timestamp": 1729513200000
}
```

## Mock Battery Service (Development)

### Starting the Mock Service

**Option 1: Standalone (for testing)**
```bash
npm run battery:mock
```

**Option 2: With PM2 (production-like)**
```bash
pm2 start ecosystem.config.cjs
```

This starts both the dashboard and the mock battery service.

### Configuration

Environment variables in `ecosystem.config.cjs`:

```javascript
env: {
  BATTERY_UPDATE_INTERVAL: '30000',  // Update every 30 seconds
  DISCHARGE_RATE: '0.5',              // Lose 0.5% per minute
  CHARGE_RATE: '1.0',                 // Gain 1% per minute
}
```

### Simulation Behavior

The mock service simulates realistic battery behavior:

1. **Discharge Mode**: Battery decreases at `DISCHARGE_RATE` per minute
2. **Charge Mode**: Battery increases at `CHARGE_RATE` per minute
3. **Auto-charging**: Automatically switches to charging at 15%
4. **Full Battery**: Stops at 100%, maintains full status
5. **Voltage Simulation**: Calculates realistic LiPo voltage (3.0V - 4.2V)
6. **Temperature Simulation**: Simulates heat during charging (35°C) and discharging (30°C)

### Manual Control

Control the mock service using signals:

```bash
# Get the process ID
pm2 list

# Toggle charging on/off
kill -USR1 <pid>

# Reset to default state (85%, discharging)
kill -USR2 <pid>
```

### Checking Battery Status

```bash
# View current battery data
npm run battery:status

# Or with formatting (if jq is installed)
cat /run/yoyo/battery.json | jq
```

## Real I2C Fuel Gauge Integration

### Supported Fuel Gauge Chips

Common I2C fuel gauge ICs that work well with Raspberry Pi:

- **MAX17048/MAX17049**: Simple, accurate, 1-cell LiPo
- **LC709203F**: Excellent for small batteries, temperature sensing
- **BQ27441**: Feature-rich, TI chip with many configuration options
- **BQ27220**: Lower cost alternative to BQ27441

### Hardware Connection

Typical I2C connection to Raspberry Pi:

```
Fuel Gauge → Raspberry Pi
--------------------------
VDD       → 3.3V (Pin 1)
GND       → GND (Pin 6)
SDA       → GPIO 2 (Pin 3)
SCL       → GPIO 3 (Pin 5)
```

### Enable I2C on Raspberry Pi

```bash
# Enable I2C interface
sudo raspi-config
# Navigate to: Interface Options → I2C → Enable

# Verify I2C is working
sudo i2cdetect -y 1

# Should show your fuel gauge address (usually 0x36 or 0x55)
```

### Creating a Real Battery Service

1. **Install I2C library**:
   ```bash
   npm install i2c-bus
   ```

2. **Create `services/i2c-battery-service.ts`**:

```typescript
import i2c from 'i2c-bus';
import fs from 'fs/promises';
import type { BatteryData } from '../app/types/battery.types.js';
import { BATTERY_DATA_FILE } from '../app/types/battery.types.js';

const I2C_BUS = 1;
const FUEL_GAUGE_ADDR = 0x36; // MAX17048 address

async function readBatteryFromI2C(): Promise<BatteryData> {
  const bus = await i2c.openPromisified(I2C_BUS);
  
  try {
    // Example for MAX17048 - adjust for your specific chip
    
    // Read State of Charge (SOC) - Register 0x04-0x05
    const socBuffer = await bus.readWord(FUEL_GAUGE_ADDR, 0x04);
    const capacity = (socBuffer >> 8) / 256 * 100; // Convert to percentage
    
    // Read voltage - Register 0x02-0x03
    const vcellBuffer = await bus.readWord(FUEL_GAUGE_ADDR, 0x02);
    const voltage = (vcellBuffer >> 4) * 0.00125; // Convert to volts
    
    // Read charging status from your charge controller
    // This depends on your specific hardware setup
    const isCharging = await checkChargingStatus(); // Your implementation
    
    // Calculate current (if your gauge supports it)
    // For MAX17048, you'd need to track voltage change over time
    const current = isCharging ? 500 : -200; // Example values
    
    // Read temperature if available
    const temperature = await readTemperature(); // Your implementation
    
    return {
      capacity: Math.round(capacity * 10) / 10,
      voltage: Math.round(voltage * 100) / 100,
      current,
      status: isCharging ? 'charging' : 'discharging',
      temperature,
      timestamp: Date.now(),
    };
  } finally {
    await bus.close();
  }
}

async function writeBatteryData(data: BatteryData): Promise<void> {
  // Same atomic write implementation as mock service
  const tempFile = `${BATTERY_DATA_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
  await fs.rename(tempFile, BATTERY_DATA_FILE);
}

async function main() {
  console.log('I2C Battery Service Starting...');
  
  const updateInterval = parseInt(process.env.BATTERY_UPDATE_INTERVAL || '30000');
  
  async function update() {
    try {
      const data = await readBatteryFromI2C();
      await writeBatteryData(data);
      console.log(`Battery: ${data.capacity}% | ${data.voltage}V | ${data.status}`);
    } catch (error) {
      console.error('Error reading battery:', error);
    }
  }
  
  await update(); // Initial read
  setInterval(update, updateInterval);
}

main();
```

3. **Update PM2 configuration** in `ecosystem.config.cjs`:

```javascript
{
  name: 'i2c-battery-service',  // Changed from 'mock-battery-service'
  script: 'tsx',
  args: 'services/i2c-battery-service.ts',  // Your new file
  instances: 1,
  autorestart: true,
  max_memory_restart: '50M',
  env: {
    BATTERY_UPDATE_INTERVAL: '30000',
  }
}
```

4. **Dashboard requires ZERO changes** - it already reads from `/run/yoyo/battery.json`!

## Chip-Specific Examples

### MAX17048/MAX17049 (Recommended for Beginners)

```typescript
// Simple chip, just SOC and voltage
const socBuffer = await bus.readWord(FUEL_GAUGE_ADDR, 0x04);
const capacity = (socBuffer >> 8) / 256 * 100;

const vcellBuffer = await bus.readWord(FUEL_GAUGE_ADDR, 0x02);
const voltage = (vcellBuffer >> 4) * 0.00125;
```

### LC709203F (With Temperature)

```typescript
const I2C_ADDR = 0x0B;

// Read RSOC (Relative State of Charge)
const capacity = await bus.readWord(I2C_ADDR, 0x0D);

// Read voltage
const voltage = await bus.readWord(I2C_ADDR, 0x09) / 1000;

// Read temperature
const tempRaw = await bus.readWord(I2C_ADDR, 0x08);
const temperature = (tempRaw - 2731.5) / 10;
```

### BQ27441 (Full Featured)

```typescript
const I2C_ADDR = 0x55;

// Standard commands
const capacity = await bus.readWord(I2C_ADDR, 0x1C); // StateOfCharge()
const voltage = await bus.readWord(I2C_ADDR, 0x04) / 1000; // Voltage() mV to V
const current = await bus.readI2cBlock(I2C_ADDR, 0x10); // Current() signed
const temperature = (await bus.readWord(I2C_ADDR, 0x02) / 10) - 273.15; // K to C
```

## Testing

### Test Battery Service Independently

```bash
# Start just the battery service
npm run battery:mock

# In another terminal, watch the output
watch -n 1 cat /run/yoyo/battery.json
```

### Test Dashboard Integration

1. Start battery service
2. Start dashboard: `npm run dev`
3. Open dashboard: `http://localhost:3000`
4. Battery widget should show live data
5. Toggle charging: `kill -USR1 <pid>`
6. Verify dashboard updates within ~30 seconds

## Troubleshooting

### Battery Data Not Updating

**Check if service is running:**
```bash
pm2 list
# Look for 'mock-battery-service' or 'i2c-battery-service'
```

**Check logs:**
```bash
pm2 logs mock-battery-service
# or
tail -f logs/battery-output.log
```

**Check file exists and is recent:**
```bash
ls -lah /run/yoyo/battery.json
cat /run/yoyo/battery.json
```

### Dashboard Shows Fallback Values (85%)

This means the dashboard can't read battery data:
- Battery service might not be running
- File permissions issue
- Data is stale (> 2 minutes old)

**Solution:**
```bash
# Restart battery service
pm2 restart mock-battery-service

# Check file permissions
ls -l /run/yoyo/battery.json
# Should be readable by the user running the dashboard
```

### I2C Device Not Found

```bash
# Check I2C is enabled
sudo raspi-config

# Scan for devices
sudo i2cdetect -y 1

# Check permissions
sudo usermod -a -G i2c $USER
# Then log out and back in
```

## Power Consumption

### Mock Service
- **Memory**: ~20-30 MB
- **CPU**: < 0.1% (sleeps between updates)
- **Power**: Negligible

### I2C Service
- **Memory**: ~20-30 MB
- **CPU**: < 0.5% (I2C communication overhead)
- **Power**: < 1mA (mostly from I2C bus)

### Optimization Tips
- Increase `BATTERY_UPDATE_INTERVAL` if updates every 30s are too frequent
- For battery-powered devices, 60s updates are usually sufficient
- Fuel gauge chips themselves consume ~5-50µA (very low)

## Migration Checklist

Switching from mock to real hardware:

- [ ] Hardware: Connect fuel gauge to I2C pins
- [ ] Enable I2C interface on Raspberry Pi
- [ ] Install `i2c-bus` npm package
- [ ] Create `services/i2c-battery-service.ts`
- [ ] Implement chip-specific I2C read functions
- [ ] Test service standalone: `tsx services/i2c-battery-service.ts`
- [ ] Verify JSON file is being written correctly
- [ ] Update `ecosystem.config.cjs` to use new service
- [ ] Restart PM2: `pm2 restart all`
- [ ] Verify dashboard shows real battery data
- [ ] Remove or keep mock service for testing

**Dashboard code requires NO changes!** 🎉

## Future Enhancements

Possible improvements for production:

1. **Battery health tracking**: Log capacity over time to detect degradation
2. **Smart charging**: Optimize charging patterns for longevity
3. **Power profiles**: Adjust system performance based on battery level
4. **Battery calibration**: Learn actual vs reported capacity
5. **Historical data**: Store battery metrics for analysis
6. **Alerts**: Push notifications for low battery
7. **Multiple batteries**: Support for battery packs with multiple cells

---

For questions or issues, check the logs or refer to your fuel gauge chip's datasheet.

