#!/bin/bash

# Setup script to configure yoyopod-dashboard to start automatically on boot
# This script configures PM2 to manage the application and start on system boot

echo "=========================================="
echo "YoyoPod Dashboard Auto-Start Setup"
echo "=========================================="
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Installing PM2 globally..."
    npm install -g pm2
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install PM2. Please run: sudo npm install -g pm2"
        exit 1
    fi
    echo "✅ PM2 installed successfully"
else
    echo "✅ PM2 is already installed"
fi

# Navigate to project directory
cd /home/raouf/yoyo/yoy_dash

# Stop any existing PM2 processes for this app
echo ""
echo "Stopping any existing PM2 processes..."
pm2 delete yoyopod-dashboard 2>/dev/null || true

# Start the application using PM2 with the ecosystem config
echo ""
echo "Starting application with PM2..."
pm2 start ecosystem.config.cjs

if [ $? -ne 0 ]; then
    echo "❌ Failed to start application with PM2"
    exit 1
fi

echo "✅ Application started successfully"

# Save the PM2 process list
echo ""
echo "Saving PM2 process list..."
pm2 save

# Generate and configure PM2 startup script
echo ""
echo "Configuring PM2 to start on system boot..."
echo "This will require sudo access..."

# Get the startup command
STARTUP_CMD=$(pm2 startup systemd -u $USER --hp $HOME | grep "sudo")

if [ -n "$STARTUP_CMD" ]; then
    echo ""
    echo "Please run the following command to complete setup:"
    echo ""
    echo "$STARTUP_CMD"
    echo ""
    echo "After running the command above, your dashboard will start automatically on reboot!"
else
    # Try to run it directly (might need sudo)
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
    
    if [ $? -eq 0 ]; then
        echo "✅ PM2 startup configured successfully!"
        echo ""
        echo "=========================================="
        echo "✅ Setup Complete!"
        echo "=========================================="
        echo ""
        echo "Your YoyoPod Dashboard will now start automatically after reboot."
        echo ""
        echo "Useful PM2 commands:"
        echo "  pm2 status              - Check application status"
        echo "  pm2 logs                - View application logs"
        echo "  pm2 restart yoyopod-dashboard - Restart the app"
        echo "  pm2 stop yoyopod-dashboard    - Stop the app"
        echo "  pm2 monit               - Monitor application in real-time"
        echo ""
    else
        echo "⚠️  Please run this script with sudo or run the suggested command manually"
    fi
fi

