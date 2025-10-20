# YoyoPod Dashboard Integration Guide

## Overview

This document provides comprehensive integration guidelines for connecting the YoyoPod Dashboard with your device services. The dashboard communicates with device services through a REST API.

## Architecture

```
┌──────────────────┐         HTTP/JSON          ┌──────────────────┐
│                  │ ◄──────────────────────────►│                  │
│  YoyoPod         │                             │  Device          │
│  Dashboard       │         REST API            │  Services        │
│  (This App)      │                             │  (Your Code)     │
│                  │                             │                  │
└──────────────────┘                             └──────────────────┘
```

## Configuration

### Base Configuration

Edit `config/integration-endpoints.json`:

```json
{
  "baseUrl": "http://localhost:5000/api",
  "authToken": "your-secure-token-here",
  "endpoints": {
    "device": "/device/status",
    "wifi": "/wifi",
    "bluetooth": "/bluetooth",
    "location": "/location",
    "voip": "/voip",
    "content": "/content",
    "ai": "/ai"
  }
}
```

### Environment Variables

Set these in your `.env` file:

```bash
SERVICE_BASE_URL=http://localhost:5000/api
SERVICE_TOKEN=your-secure-token-here
```

## Required API Endpoints

### 1. Device Status

**Endpoint:** `GET /api/device/status`

**Headers:**
```
X-Dashboard-Token: your-secure-token-here
```

**Response:**
```json
{
  "battery": 85,
  "charging": false,
  "signal": {
    "wifi": 75,
    "lte": 90
  },
  "storage": {
    "used": 5368709120,
    "total": 16106127360
  },
  "uptime": 86400,
  "temperature": 45
}
```

### 2. WiFi Management

#### Scan Networks

**Endpoint:** `GET /api/wifi/scan`

**Response:**
```json
[
  {
    "ssid": "MyNetwork",
    "signal": 85,
    "security": "wpa2",
    "frequency": "5GHz"
  }
]
```

#### Connect to Network

**Endpoint:** `POST /api/wifi/connect`

**Request Body:**
```json
{
  "ssid": "MyNetwork",
  "password": "secret123"
}
```

**Response:**
```json
{
  "success": true,
  "ip": "192.168.1.100"
}
```

#### Get Current WiFi

**Endpoint:** `GET /api/wifi/current`

**Response:**
```json
{
  "ssid": "MyNetwork",
  "signal": 85
}
```

### 3. Bluetooth Management

#### Scan Devices

**Endpoint:** `GET /api/bluetooth/scan`

**Response:**
```json
[
  {
    "address": "00:11:22:33:44:55",
    "name": "Bluetooth Headphones",
    "paired": false,
    "connected": false,
    "type": "headphones"
  }
]
```

#### Get Paired Devices

**Endpoint:** `GET /api/bluetooth/devices`

**Response:** Same format as scan

#### Pair Device

**Endpoint:** `POST /api/bluetooth/pair`

**Request Body:**
```json
{
  "address": "00:11:22:33:44:55"
}
```

**Response:**
```json
{
  "success": true
}
```

#### Connect Device

**Endpoint:** `POST /api/bluetooth/connect`

**Request Body:**
```json
{
  "address": "00:11:22:33:44:55"
}
```

#### Forget Device

**Endpoint:** `DELETE /api/bluetooth/device/:address`

### 4. Location Services

#### Get Current Location

**Endpoint:** `GET /api/location/current`

**Response:**
```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "accuracy": 10,
  "timestamp": "2024-01-01T12:00:00Z",
  "address": "123 Main St, San Francisco, CA"
}
```

#### Get Location History

**Endpoint:** `GET /api/location/history?since=<ISO8601>`

**Response:**
```json
[
  {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy": 10,
    "timestamp": "2024-01-01T12:00:00Z",
    "address": "123 Main St, San Francisco, CA"
  }
]
```

### 5. VoIP Services (Call Variant Only)

#### Get Call History

**Endpoint:** `GET /api/voip/call-history?limit=50`

**Response:**
```json
[
  {
    "id": "call-123",
    "contactName": "Mom",
    "phoneNumber": "+1-555-1234",
    "direction": "outgoing",
    "duration": 180,
    "timestamp": "2024-01-01T12:00:00Z",
    "answered": true
  }
]
```

#### Initiate Call

**Endpoint:** `POST /api/voip/initiate-call`

**Request Body:**
```json
{
  "contactId": "contact-123"
}
```

### 6. Content Services

#### Get Current Playback

**Endpoint:** `GET /api/content/current-playback`

**Response:**
```json
{
  "type": "music",
  "title": "My Favorite Song",
  "artist": "Artist Name",
  "progress": 120
}
```

#### Get Content Library

**Endpoint:** `GET /api/content/playlists`

**Response:**
```json
[
  {
    "id": "playlist-123",
    "type": "playlist",
    "title": "Kids Music",
    "creator": "Various Artists",
    "explicit": false,
    "enabled": true
  }
]
```

#### Sync Playlists

**Endpoint:** `POST /api/content/sync-playlists`

**Request Body:**
```json
{
  "playlistIds": ["playlist-123", "playlist-456"]
}
```

**Response:**
```json
{
  "synced": 2
}
```

### 7. AI Services (AI Variant Only)

#### Get Conversations

**Endpoint:** `GET /api/ai/conversations?date=YYYY-MM-DD`

**Response:**
```json
[
  {
    "id": "conv-123",
    "timestamp": "2024-01-01T12:00:00Z",
    "duration": 300,
    "summary": "Conversation about dinosaurs"
  }
]
```

#### Get Conversation Transcript

**Endpoint:** `GET /api/ai/conversation/:id/transcript`

**Response:**
```json
{
  "messages": [
    {
      "role": "child",
      "content": "Tell me about dinosaurs"
    },
    {
      "role": "ai",
      "content": "Dinosaurs were..."
    }
  ]
}
```

## Error Handling

All endpoints should return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

Error response format:
```json
{
  "error": "Error message here",
  "code": "ERROR_CODE"
}
```

## Authentication

All requests include the header:
```
X-Dashboard-Token: your-secure-token-here
```

Implement this on your service side to verify requests are coming from the dashboard.

## Testing

Use the provided test script to verify your service implementation:

```bash
./scripts/test-integration.sh
```

## Support

For integration support, refer to the main README or contact the YoyoPod team.

