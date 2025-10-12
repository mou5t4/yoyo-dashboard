#!/bin/bash
# YoyoPod Dashboard Health Check Script

HEALTH_ENDPOINT="http://localhost:3000/api/health"

echo "🏥 YoyoPod Dashboard Health Check"
echo "================================="
echo ""

# Check if dashboard is running
if ! pm2 list | grep -q "yoyopod-dashboard.*online"; then
    echo "❌ Dashboard is not running"
    echo "   Run './scripts/start.sh' to start it"
    exit 1
fi

echo "✓ Dashboard process is running"
echo ""

# Check health endpoint
if command -v curl &> /dev/null; then
    echo "Checking health endpoint..."
    response=$(curl -s -w "\n%{http_code}" $HEALTH_ENDPOINT)
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$status_code" = "200" ]; then
        echo "✅ Health check passed"
        echo ""
        echo "Response:"
        echo "$body" | jq . 2>/dev/null || echo "$body"
    else
        echo "❌ Health check failed (HTTP $status_code)"
        echo ""
        echo "Response:"
        echo "$body"
        exit 1
    fi
else
    echo "⚠️  curl not found. Install curl to check health endpoint."
fi

echo ""
echo "📊 PM2 Status:"
pm2 status

