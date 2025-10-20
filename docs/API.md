# YoyoPod Dashboard API Documentation

## Internal API Routes

The dashboard exposes several API endpoints for internal use.

## Health Check

**Endpoint:** `GET /api/health`

**Description:** Check the health status of the dashboard.

**Response:**
```json
{
  "healthy": true,
  "checks": {
    "database": { "status": "ok" },
    "disk": { "status": "ok", "available": "5GB" },
    "services": { "status": "ok" },
    "memory": {
      "rss": 67584000,
      "heapTotal": 45056000,
      "heapUsed": 31232000
    }
  }
}
```

## Device Info

**Endpoint:** `GET /api/device-info`

**Description:** Get consolidated device information.

**Authentication:** Required (session cookie)

**Response:**
```json
{
  "device": {
    "name": "YoyoPod",
    "variant": "core",
    "firmware": "1.0.0"
  },
  "status": {
    "battery": 85,
    "charging": false,
    "wifi": {
      "connected": true,
      "ssid": "MyNetwork",
      "signal": 75
    }
  },
  "location": {
    "enabled": true,
    "current": {
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  }
}
```

## Logout

**Endpoint:** `POST /auth/logout`

**Description:** Logout the current user and destroy the session.

**Authentication:** Required (session cookie)

**Response:** Redirect to `/`

## Form Actions

All authenticated routes support POST actions for:

- Settings updates
- Contact management
- WiFi configuration
- Bluetooth management
- Geofence management
- Schedule management

These are handled through Remix's form action pattern and don't need to be called directly via fetch.

## WebSocket Support (Future)

Real-time updates may be added in future versions using WebSockets for:

- Live device status
- Location tracking
- Call notifications
- Content playback updates

