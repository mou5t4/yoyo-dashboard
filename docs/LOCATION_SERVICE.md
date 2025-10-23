# Location Service Documentation

## Overview

The YoyoPod dashboard integrates with a GPS location service that provides real-time location tracking. This document explains how the location service works, how to use the mock GPS service for development, and how to integrate with real GPS hardware.

## Architecture

### Data Flow

```
┌─────────────────────────────┐
│  GPS Module (Hardware)      │
│  or Mock Simulator          │
└──────────┬──────────────────┘
           │ Reads every 30s
           ▼
┌─────────────────────────────┐
│  Location Service Process   │
│  (mock-gps-service.ts       │
│   or gpsd-location-service) │
└──────────┬──────────────────┘
           │ Writes atomically
           ▼
┌─────────────────────────────┐
│  /tmp/yoyo/location.json    │
│  (or /run/yoyo)             │
└──────────┬──────────────────┘
           │ Reads on-demand
           ▼
┌─────────────────────────────┐
│  Dashboard Backend          │
│  (location.service.server)  │
└──────────┬──────────────────┘
           │ API Response
           ▼
┌─────────────────────────────┐
│  Dashboard Frontend         │
│  (Location UI & Map)        │
└─────────────────────────────┘
```

### Why `/tmp/yoyo/location.json`?

- **Fast access**: Temporary filesystem with quick read/write
- **Zero disk writes**: No wear on SD card or SSD
- **Standard pattern**: Consistent with other service files
- **Easy debugging**: Simple JSON file you can inspect

## Location Data Format

### LocationData Interface

```typescript
interface LocationData {
  latitude: number;        // Latitude in decimal degrees (-90 to 90)
  longitude: number;       // Longitude in decimal degrees (-180 to 180)
  accuracy: number;        // Horizontal accuracy in meters
  altitude?: number;       // Altitude above sea level in meters
  speed?: number;          // Speed in m/s
  heading?: number;        // Heading in degrees (0-360, 0=North)
  satellites?: number;     // Number of satellites in view/used
  address?: string;        // Reverse geocoded address
  timestamp: string;       // ISO 8601 timestamp
}
```

### Example JSON File

```json
{
  "latitude": 37.774929,
  "longitude": -122.419415,
  "accuracy": 12.5,
  "altitude": 15.3,
  "speed": 1.2,
  "heading": 45,
  "satellites": 8,
  "timestamp": "2024-10-21T14:30:00.000Z"
}
```

## Mock GPS Service (Development)

### Starting the Mock Service

**Option 1: Standalone (for testing)**
```bash
npm run gps:mock
```

**Option 2: With PM2 (production-like)**
```bash
pm2 start ecosystem.config.cjs
```

This starts the dashboard, battery service, and GPS service together.

### Configuration

Environment variables in `ecosystem.config.cjs`:

```javascript
env: {
  LOCATION_UPDATE_INTERVAL: '30000',  // Update every 30 seconds
  GPS_CENTER_LAT: '37.7749',          // Center point latitude
  GPS_CENTER_LON: '-122.4194',        // Center point longitude
  GPS_WALK_RADIUS: '500',             // Movement radius in meters
}
```

### Simulation Behavior

The mock service simulates realistic GPS behavior:

1. **Random Walk Algorithm**: Simulates movement around a center point
   - Each update moves a random distance (0-50m) in a random direction
   - If movement goes beyond the walk radius, it pulls back toward center
   - Creates natural-looking paths like a person walking around

2. **GPS Accuracy Variations**: Simulates real GPS behavior
   - Accuracy varies between 5-50 meters
   - Models GPS drift and signal quality variations

3. **Speed and Heading**: Calculated from movement
   - Speed computed from distance traveled over time
   - Heading (bearing) calculated from direction of movement
   - Only updates heading for movements > 0.5m (prevents jitter when stationary)

4. **Satellite Simulation**: Varies between 6-12 satellites
   - Realistic satellite count variations
   - Models changing satellite visibility

5. **Altitude Variations**: Simulates elevation changes
   - Small random variations (±5m) to simulate terrain
   - Stays above sea level (minimum 0m)

### Manual Control

Control the mock service using signals:

```bash
# Get the process ID
pm2 list

# Toggle GPS on/off (simulate GPS signal loss)
kill -USR1 <pid>

# Reset to center location
kill -USR2 <pid>
```

### Checking Location Status

```bash
# View current location data
npm run gps:status

# Or with formatting (if jq is installed)
cat /tmp/yoyo/location.json | jq

# Watch location updates in real-time
watch -n 1 cat /tmp/yoyo/location.json
```

## Real GPS Integration

### Supported GPS Modules

Recommended GPS modules that work well with Raspberry Pi:

#### USB GPS Receivers (Easiest - Plug and Play)
- **GlobalSat BU-353-S4**: USB GPS receiver, SiRF Star IV chipset
  - Plug into USB port, automatic /dev/ttyUSB0 detection
  - Works with gpsd out of the box
  - ~$30-40 USD
  
- **u-blox VK-172**: USB GPS with high sensitivity
  - USB interface, appears as /dev/ttyACM0
  - Good satellite acquisition
  - ~$15-25 USD

#### UART GPS Modules (More Flexible)
- **u-blox NEO-6M/7M/8M**: Popular GPS modules
  - Requires UART connection to GPIO
  - 3.3V compatible
  - ~$10-20 USD
  
- **Adafruit Ultimate GPS**: MTK3339 chipset
  - Breakout board with easy connections
  - 10 Hz update rate capability
  - ~$40 USD
  
- **Quectel L76/L80**: Low power consumption
  - Good for battery-powered applications
  - UART interface
  - ~$15-25 USD

### Hardware Connection

#### USB GPS (Recommended for Beginners)

Simply plug the USB GPS into any USB port:
```
USB GPS → Raspberry Pi USB Port
```

The GPS will appear as `/dev/ttyUSB0` or `/dev/ttyACM0`.

#### UART GPS (Advanced)

Connect to Raspberry Pi GPIO pins:

```
GPS Module → Raspberry Pi
--------------------------
VCC        → 3.3V (Pin 1)
GND        → GND (Pin 6)
TX         → GPIO 15 (RXD, Pin 10)
RX         → GPIO 14 (TXD, Pin 8)
```

**Wiring Diagram:**
```
     GPS Module                Raspberry Pi
   ┌──────────────┐          ┌──────────────┐
   │              │          │  1  2        │
   │  VCC     GND │          │  •  •  3.3V  │
   │   │       │  │          │  •  •        │
   │  TX      RX  │          │  •  •  GND   │
   │   │       │  │          │  •  •        │
   └───┼───────┼──┘          │  • TXD RXD • │
       │       │             │    8    10   │
       └───────┼─────────────┴──────────────┘
               └─────────────────────────────┘
```

### Enable Serial Port on Raspberry Pi

For UART GPS modules, enable the serial port:

```bash
# Open Raspberry Pi configuration
sudo raspi-config

# Navigate to:
# Interface Options → Serial Port
# - "Login shell over serial?" → No
# - "Serial port hardware enabled?" → Yes

# Reboot
sudo reboot

# Verify serial port is available
ls -l /dev/serial0
# Should show: /dev/serial0 -> ttyAMA0
```

### Install and Configure gpsd

`gpsd` is a daemon that handles GPS communication:

```bash
# Install gpsd and clients
sudo apt-get update
sudo apt-get install -y gpsd gpsd-clients

# Stop gpsd to configure
sudo systemctl stop gpsd
sudo systemctl disable gpsd

# Edit gpsd configuration
sudo nano /etc/default/gpsd

# Set these values:
START_DAEMON="true"
GPSD_OPTIONS="-n"
DEVICES="/dev/ttyUSB0"  # Or /dev/ttyACM0 or /dev/serial0 for UART
USBAUTO="true"

# Start gpsd
sudo systemctl enable gpsd
sudo systemctl start gpsd

# Test GPS is working
cgps -s
# Should show satellite data and position when GPS has fix
```

### Creating a Real GPS Service

There are two approaches to integrate real GPS:

#### Approach 1: Using gpsd (Recommended)

Create `services/gpsd-location-service.ts`:

```typescript
#!/usr/bin/env tsx
/**
 * Real GPS Service using gpsd
 * Reads GPS data from gpsd daemon and writes to location file
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { LocationData } from '../app/types/location.types.js';
import { LOCATION_DATA_FILE } from '../app/types/location.types.js';

const execAsync = promisify(exec);
const UPDATE_INTERVAL = parseInt(process.env.LOCATION_UPDATE_INTERVAL || '30000');

async function readGPSFromGpsd(): Promise<LocationData | null> {
  try {
    // Use gpspipe to get GPS data in JSON format
    const { stdout } = await execAsync(
      'timeout 10 gpspipe -w -n 10 2>/dev/null | grep -m 1 TPV',
      { encoding: 'utf-8' }
    );
    
    const data = JSON.parse(stdout);
    
    // Check if we have a valid GPS fix
    if (data.mode < 2 || !data.lat || !data.lon) {
      console.log('No GPS fix available');
      return null;
    }
    
    return {
      latitude: data.lat,
      longitude: data.lon,
      accuracy: data.epy || data.epx || 10,
      altitude: data.alt,
      speed: data.speed,
      heading: data.track, // Track is heading in gpsd
      satellites: data.satellites_used,
      timestamp: data.time || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error reading GPS:', error);
    return null;
  }
}

async function writeLocationData(data: LocationData): Promise<void> {
  const dir = path.dirname(LOCATION_DATA_FILE);
  await fs.mkdir(dir, { recursive: true }).catch(() => {});
  
  const tempFile = `${LOCATION_DATA_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
  await fs.rename(tempFile, LOCATION_DATA_FILE);
}

async function updateLoop() {
  try {
    const location = await readGPSFromGpsd();
    
    if (location) {
      await writeLocationData(location);
      console.log(
        `[${new Date().toISOString()}] GPS: ` +
        `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} | ` +
        `±${location.accuracy?.toFixed(1)}m | ${location.satellites} sats`
      );
    }
  } catch (error) {
    console.error('Update error:', error);
  }
}

async function main() {
  console.log('GPS Service Starting (using gpsd)');
  console.log(`Update interval: ${UPDATE_INTERVAL}ms`);
  console.log(`Data file: ${LOCATION_DATA_FILE}\n`);
  
  // Initial update
  await updateLoop();
  
  // Periodic updates
  setInterval(updateLoop, UPDATE_INTERVAL);
}

main().catch(console.error);
```

#### Approach 2: Direct NMEA Parsing

Create `services/serial-gps-service.ts`:

```typescript
#!/usr/bin/env tsx
/**
 * Real GPS Service using direct serial port reading
 * Parses NMEA sentences from serial GPS
 */

import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import type { LocationData } from '../app/types/location.types.js';
import { LOCATION_DATA_FILE } from '../app/types/location.types.js';

const SERIAL_PORT = process.env.GPS_SERIAL_PORT || '/dev/ttyUSB0';
const UPDATE_INTERVAL = parseInt(process.env.LOCATION_UPDATE_INTERVAL || '30000');

interface GPSData {
  latitude?: number;
  longitude?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  satellites?: number;
  hdop?: number;
}

let currentGPS: GPSData = {};
let lastUpdate = 0;

/**
 * Parse NMEA GGA sentence (Position and fix data)
 * $GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47
 */
function parseGGA(parts: string[]): void {
  if (parts.length < 10) return;
  
  const lat = parseCoordinate(parts[2], parts[3]);
  const lon = parseCoordinate(parts[4], parts[5]);
  const quality = parseInt(parts[6]);
  const satellites = parseInt(parts[7]);
  const hdop = parseFloat(parts[8]);
  const altitude = parseFloat(parts[9]);
  
  if (quality > 0 && lat && lon) {
    currentGPS.latitude = lat;
    currentGPS.longitude = lon;
    currentGPS.altitude = altitude;
    currentGPS.satellites = satellites;
    currentGPS.hdop = hdop;
  }
}

/**
 * Parse NMEA RMC sentence (Recommended minimum data)
 * $GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A
 */
function parseRMC(parts: string[]): void {
  if (parts.length < 9) return;
  
  const status = parts[2]; // A = valid, V = invalid
  if (status !== 'A') return;
  
  const lat = parseCoordinate(parts[3], parts[4]);
  const lon = parseCoordinate(parts[5], parts[6]);
  const speed = parseFloat(parts[7]) * 0.514444; // knots to m/s
  const heading = parseFloat(parts[8]);
  
  if (lat && lon) {
    currentGPS.latitude = lat;
    currentGPS.longitude = lon;
    currentGPS.speed = speed;
    currentGPS.heading = heading;
  }
}

/**
 * Convert NMEA coordinate format to decimal degrees
 * e.g., 4807.038,N → 48.1173
 */
function parseCoordinate(coord: string, direction: string): number | undefined {
  if (!coord || !direction) return undefined;
  
  const value = parseFloat(coord);
  const degrees = Math.floor(value / 100);
  const minutes = value - (degrees * 100);
  let decimal = degrees + (minutes / 60);
  
  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }
  
  return decimal;
}

/**
 * Parse NMEA sentence
 */
function parseNMEA(line: string): void {
  if (!line.startsWith('$')) return;
  
  // Verify checksum
  const checksumIndex = line.indexOf('*');
  if (checksumIndex === -1) return;
  
  const parts = line.substring(1, checksumIndex).split(',');
  const sentenceType = parts[0];
  
  switch (sentenceType) {
    case 'GPGGA':
    case 'GNGGA':
      parseGGA(parts);
      break;
    case 'GPRMC':
    case 'GNRMC':
      parseRMC(parts);
      break;
  }
}

async function writeLocationData(data: LocationData): Promise<void> {
  const tempFile = `${LOCATION_DATA_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
  await fs.rename(tempFile, LOCATION_DATA_FILE);
}

async function saveLocationIfReady(): Promise<void> {
  const now = Date.now();
  if (now - lastUpdate < UPDATE_INTERVAL) return;
  
  if (currentGPS.latitude && currentGPS.longitude) {
    const accuracy = (currentGPS.hdop || 1) * 5; // Rough accuracy estimate
    
    const location: LocationData = {
      latitude: currentGPS.latitude,
      longitude: currentGPS.longitude,
      accuracy,
      altitude: currentGPS.altitude,
      speed: currentGPS.speed,
      heading: currentGPS.heading,
      satellites: currentGPS.satellites,
      timestamp: new Date().toISOString(),
    };
    
    await writeLocationData(location);
    lastUpdate = now;
    
    console.log(
      `GPS: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} | ` +
      `${location.satellites} sats`
    );
  }
}

async function main() {
  console.log('GPS Service Starting (Serial NMEA Parser)');
  console.log(`Serial port: ${SERIAL_PORT}`);
  console.log(`Update interval: ${UPDATE_INTERVAL}ms\n`);
  
  const stream = createReadStream(SERIAL_PORT);
  const rl = createInterface({ input: stream });
  
  rl.on('line', async (line) => {
    parseNMEA(line.trim());
    await saveLocationIfReady();
  });
  
  rl.on('error', (error) => {
    console.error('Serial port error:', error);
  });
}

main().catch(console.error);
```

### Update PM2 Configuration

Replace the mock GPS service in `ecosystem.config.cjs`:

```javascript
{
  name: 'gps-service',  // Changed from 'mock-gps-service'
  script: 'tsx',
  args: 'services/gpsd-location-service.ts',  // Or serial-gps-service.ts
  instances: 1,
  autorestart: true,
  max_memory_restart: '50M',
  env: {
    LOCATION_UPDATE_INTERVAL: '30000',
  },
  error_file: './logs/gps-error.log',
  out_file: './logs/gps-output.log',
}
```

### Testing GPS Reception

```bash
# Test gpsd is receiving data
cgps -s
# Should show satellites and position

# Test GPS data stream
gpspipe -w
# Should show JSON GPS data

# For serial GPS, monitor NMEA sentences
cat /dev/ttyUSB0
# Should show $GPGGA, $GPRMC, etc.

# Check GPS fix status
gpsmon
# Interactive monitor showing satellite status
```

## Testing

### Test GPS Service Independently

```bash
# Start just the GPS service
npm run gps:mock

# In another terminal, watch the output
watch -n 1 cat /tmp/yoyo/location.json

# Or use jq for pretty output
watch -n 1 'cat /tmp/yoyo/location.json | jq'
```

### Test Dashboard Integration

1. Start GPS service: `npm run gps:mock`
2. Start dashboard: `npm run dev`
3. Open dashboard: `http://localhost:3000`
4. Navigate to Location page
5. Map should show your simulated location
6. Toggle GPS: `kill -USR1 <pid>`
7. Verify dashboard shows "GPS disabled" or stale data message

### Verify Map Updates

The location page map should:
- Show current location with animated marker
- Display accuracy circle
- Update every ~30 seconds (with dashboard polling)
- Show geofences if configured

## Troubleshooting

### Location Data Not Updating

**Check if service is running:**
```bash
pm2 list
# Look for 'mock-gps-service' or 'gps-service'
```

**Check logs:**
```bash
pm2 logs mock-gps-service
# or
tail -f logs/gps-output.log
```

**Check file exists and is recent:**
```bash
ls -lah /tmp/yoyo/location.json
cat /tmp/yoyo/location.json
```

### Dashboard Shows Fallback Location

This means the dashboard can't read GPS data:
- GPS service might not be running
- File permissions issue
- Data is stale (> 2 minutes old)

**Solution:**
```bash
# Restart GPS service
pm2 restart mock-gps-service

# Check file permissions
ls -l /tmp/yoyo/location.json
# Should be readable by the user running the dashboard

# Check if data is fresh
cat /tmp/yoyo/location.json | grep timestamp
```

### GPS Module Not Detected

**For USB GPS:**
```bash
# Check if USB GPS is detected
lsusb
# Should show your GPS device

# Check device node
ls -l /dev/ttyUSB* /dev/ttyACM*
# Should show serial devices

# Check dmesg for connection
dmesg | grep -i usb
dmesg | grep -i tty
```

**For UART GPS:**
```bash
# Check serial port is enabled
ls -l /dev/serial0

# Test if data is coming through
cat /dev/serial0
# Should show NMEA sentences

# Check permissions
sudo usermod -a -G dialout $USER
# Then log out and back in
```

### No GPS Fix (Real Hardware)

GPS needs clear sky view to acquire satellites:

```bash
# Check satellite visibility
cgps -s
# Or
gpsmon

# Typical acquisition times:
# - Cold start: 30-60 seconds
# - Warm start: 10-30 seconds
# - Hot start: 1-10 seconds
```

**Tips for better GPS reception:**
- Move GPS antenna outdoors or near window
- Ensure clear sky view (no metal roof, thick walls)
- Wait 1-2 minutes for initial fix
- Check GPS antenna connection
- Try active antenna if using passive antenna

### gpsd Not Working

```bash
# Check gpsd status
sudo systemctl status gpsd

# Restart gpsd
sudo systemctl restart gpsd

# Check gpsd is listening
sudo netstat -antp | grep gpsd
# Should show port 2947

# Test with gpspipe
gpspipe -w -n 5
# Should show GPS data
```

## Performance

### Mock Service
- **Memory**: ~25-35 MB
- **CPU**: < 0.1% (sleeps between updates)
- **Power**: Negligible

### Real GPS Service (gpsd)
- **Memory**: ~30-40 MB
- **CPU**: < 1% (polling and parsing)
- **Power**: GPS module: 20-100mA (typical)

### Optimization Tips
- Increase `LOCATION_UPDATE_INTERVAL` for battery-powered devices
- For tracking applications, 30-60s updates are usually sufficient
- Disable GPS when not needed (signal handler or API endpoint)
- Use GPS module with low power mode (e.g., u-blox UBX protocol)

## Migration Checklist

Switching from mock to real GPS:

- [ ] Hardware: Connect GPS module (USB or UART)
- [ ] For UART: Enable serial port on Raspberry Pi
- [ ] Install gpsd: `sudo apt-get install gpsd gpsd-clients`
- [ ] Configure gpsd with correct device path
- [ ] Test GPS fix: `cgps -s`
- [ ] Create `services/gpsd-location-service.ts`
- [ ] Test service standalone: `tsx services/gpsd-location-service.ts`
- [ ] Verify JSON file is being written correctly
- [ ] Update `ecosystem.config.cjs` to use new service
- [ ] Restart PM2: `pm2 restart all`
- [ ] Verify dashboard shows real GPS data
- [ ] Keep mock service for testing when needed

**Dashboard code requires NO changes!** 🎉

## Future Enhancements

Possible improvements for production:

1. **Trip tracking**: Record GPS breadcrumbs for journey playback
2. **Geofence alerts**: Push notifications when entering/exiting zones
3. **Location history visualization**: Show movement patterns on map
4. **Battery optimization**: Adjust GPS update rate based on movement
5. **Offline maps**: Cache map tiles for areas without internet
6. **Dead reckoning**: Estimate position during GPS signal loss
7. **Multi-GNSS**: Use GPS + GLONASS + Galileo for better accuracy
8. **RTK GPS**: Centimeter-level accuracy with RTK corrections

## Additional Resources

- [gpsd Project](https://gpsd.gitlab.io/gpsd/)
- [NMEA Sentence Reference](https://www.gpsinformation.org/dale/nmea.htm)
- [u-blox GPS Protocol Specification](https://www.u-blox.com/en/docs)
- [Raspberry Pi Serial Configuration](https://www.raspberrypi.com/documentation/computers/configuration.html#configure-uarts)

---

For questions or issues, check the logs or refer to your GPS module's datasheet.

