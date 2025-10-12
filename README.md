# YoyoPod Parent Dashboard

A production-ready parent management dashboard for YoyoPod, a screen-free streaming device for children. Built with Remix, React, and Tailwind CSS, optimized for Raspberry Pi Zero 2 W.

## Features

✨ **Mobile-First Design** - Responsive interface optimized for smartphones and tablets

🔐 **Secure Authentication** - Strong password requirements, session management, and audit logging

📡 **Device Monitoring** - Real-time battery, WiFi signal, storage, and activity tracking

📶 **WiFi Configuration** - Scan and connect to wireless networks

🔵 **Bluetooth Management** - Pair and manage Bluetooth devices

📍 **Location Tracking** - GPS monitoring with geofencing support (optional)

📞 **Contact Management** - VoIP contacts with quick-dial support (Call variant)

🎵 **Content Control** - Manage playlists, podcasts, and content filters

🤖 **AI Guardrails** - Conversation logging and topic filtering (AI variant)

📅 **Usage Schedules** - Time-based content restrictions and bedtime modes

📊 **Activity Reports** - Daily, weekly, and monthly usage analytics

⚙️ **Comprehensive Settings** - Volume limits, parental controls, and device configuration

## Quick Start

### Prerequisites

- Raspberry Pi Zero 2 W (or any system with Node.js 20+)
- Node.js 20.x or higher
- 4GB storage minimum

### Installation

```bash
# Clone the repository
cd yoyopod-dashboard

# Run setup script
chmod +x scripts/*.sh
./scripts/setup.sh

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start the dashboard
   ./scripts/start.sh
   ```

### First-Time Access

1. Open browser: `https://localhost:3000`
2. Accept license agreement
3. Set your password (default: `yoyopod2024`)
4. Access dashboard

## Project Structure

```
yoyopod-dashboard/
├── app/
│   ├── routes/              # Remix routes
│   ├── components/          # React components
│   ├── lib/                 # Utilities & helpers
│   ├── services/            # Device service integrations
│   ├── styles/              # Global styles
│   └── types/               # TypeScript types
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Database seeder
├── public/                  # Static assets
├── config/                  # Configuration files
├── scripts/                 # Deployment scripts
├── docs/                    # Documentation
└── tests/                   # Test files
```

## Technology Stack

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Remix (full-stack React framework)
- **Language:** TypeScript (strict mode)
- **Database:** SQLite with Prisma ORM
- **Authentication:** Cookie-based sessions with bcrypt
- **Logging:** Winston with log rotation

### Frontend
- **Framework:** React 18 + Remix
- **Styling:** Tailwind CSS 3.x
- **Components:** shadcn/ui
- **Icons:** Lucide React
- **Validation:** Zod schemas
- **Maps:** Leaflet (for location features)

### DevOps
- **Package Manager:** pnpm
- **Process Manager:** PM2
- **Build System:** Vite + Remix
- **Deployment:** Scripts for Raspberry Pi

## Configuration

### Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-secure-secret-here

# Database
DATABASE_URL="file:./yoyopod.db"

# Service Integration
SERVICE_TOKEN=your-service-token
SERVICE_BASE_URL=http://localhost:5000/api

# Security
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW_MS=900000
```

### Device Variants

Configure your device variant in `config/device-variant.json`:

```json
{
  "variant": "core",
  "features": {
    "voip": false,
    "gps": true,
    "ai": false,
    "bluetooth": true
  }
}
```

**Variants:**
- `core` - Basic streaming device
- `call` - Includes VoIP features
- `ai` - Includes AI assistant

## Integration

The dashboard communicates with your device services via REST API. See [INTEGRATION.md](docs/INTEGRATION.md) for detailed integration guidelines.

### Required Endpoints

- `GET /api/device/status` - Device information
- `GET /api/wifi/scan` - Scan WiFi networks
- `POST /api/wifi/connect` - Connect to network
- `GET /api/bluetooth/devices` - Bluetooth devices
- `GET /api/location/current` - Current location
- And more...

## Scripts

### Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev

# Run tests
pnpm test
```

### Production

```bash
# Setup (first time)
./scripts/setup.sh

# Start dashboard
./scripts/start.sh

# Check health
./scripts/health-check.sh

# Run migrations
./scripts/migrate.sh
```

### PM2 Management

```bash
# View status
pm2 status

# View logs
pm2 logs yoyopod-dashboard

# Restart
pm2 restart yoyopod-dashboard

# Stop
pm2 stop yoyopod-dashboard
```

## Documentation

- **[Integration Guide](docs/INTEGRATION.md)** - Device service integration
- **[API Documentation](docs/API.md)** - Internal API endpoints
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Installation and deployment
- **[Security Guidelines](docs/SECURITY.md)** - Security best practices

## Mobile Access

### Find Device IP

```bash
hostname -I
```

### Access from Phone

```
https://192.168.1.XXX:3000
```

Accept the self-signed certificate warning on first access.

### PWA Installation

The dashboard can be installed as a Progressive Web App (PWA) on iOS and Android for a native app experience.

## Security

- **Local Storage Only** - No cloud sync, all data stays on device
- **Strong Authentication** - Password requirements and session management
- **HTTPS Required** - Self-signed certificate generated on setup
- **Rate Limiting** - Protection against brute force attacks
- **Audit Logging** - All actions logged for review
- **COPPA/GDPR Compliant** - Privacy-first design

See [SECURITY.md](docs/SECURITY.md) for comprehensive security guidelines.

## Performance

Optimized for Raspberry Pi Zero 2 W:

- **Load time:** <3 seconds on Pi Zero 2 W
- **Memory usage:** ~150MB
- **CPU usage:** Minimal (polling every 30s)
- **Storage:** ~100MB (excluding database)

## Troubleshooting

### Dashboard won't start

```bash
# Check logs
pm2 logs yoyopod-dashboard

# Rebuild
pnpm build

# Restart
pm2 restart yoyopod-dashboard
```

### Port 3000 in use

```bash
# Find process
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

### Database locked

```bash
# Stop dashboard
pm2 stop yoyopod-dashboard

# Restart
pm2 restart yoyopod-dashboard
```

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for more troubleshooting tips.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

Copyright © 2024 YoyoPod. All rights reserved.

This software is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Privacy

- **No Analytics** - We don't track usage
- **No Telemetry** - No data sent to external servers
- **Local Only** - All data stays on your device
- **Open Source** - Transparent and auditable

## Support

- **Documentation:** [docs/](docs/)
- **Issues:** GitHub Issues
- **Email:** support@yoyopod.com
- **Forum:** community.yoyopod.com

## Roadmap

- [ ] Multi-language support
- [ ] Dark mode toggle
- [ ] Remote access (optional)
- [ ] Backup/restore functionality
- [ ] Advanced analytics
- [ ] Multi-device management
- [ ] Parent account sharing

## Acknowledgments

Built with:
- [Remix](https://remix.run) - Full-stack React framework
- [Prisma](https://prisma.io) - Next-generation ORM
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS
- [shadcn/ui](https://ui.shadcn.com) - Beautiful components
- [Lucide](https://lucide.dev) - Icon library

## Version

**Current Version:** 1.0.0

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

Made with ❤️ for parents and children everywhere.
