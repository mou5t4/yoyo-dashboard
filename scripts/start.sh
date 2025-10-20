#!/bin/bash
# YoyoPod Dashboard Start Script

set -e

echo "🚀 Starting YoyoPod Dashboard..."
echo ""

# Check if build exists
if [ ! -d "build" ]; then
    echo "❌ Build directory not found. Please run './scripts/setup.sh' first."
    exit 1
fi

# Set environment
export NODE_ENV=production

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Start with PM2
pm2 start ecosystem.config.js --env production

# Show status
echo ""
pm2 status

# Show logs
echo ""
echo "✅ Dashboard is running!"
echo ""
echo "📱 Access the dashboard at:"
echo "   https://localhost:3000"
echo ""
echo "📊 View logs:"
echo "   pm2 logs yoyopod-dashboard"
echo ""
echo "🛑 Stop dashboard:"
echo "   pm2 stop yoyopod-dashboard"
echo ""

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot (optional)
echo "💡 To start dashboard on boot, run:"
echo "   pm2 startup"
echo ""

