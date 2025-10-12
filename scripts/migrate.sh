#!/bin/bash
# YoyoPod Dashboard Database Migration Script

set -e

echo "🗃️  YoyoPod Dashboard Database Migration"
echo "======================================="
echo ""

# Check if Prisma is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed"
    exit 1
fi

# Run migrations
echo "Running migrations..."
pnpm prisma migrate deploy

echo ""
echo "✅ Migrations completed successfully"
echo ""

# Optional: Show migration status
echo "Migration status:"
pnpm prisma migrate status

