#!/bin/bash
# YoyoPod Dashboard Setup Script

set -e

echo "🚀 YoyoPod Dashboard Setup"
echo "=========================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

echo "✓ pnpm version: $(pnpm --version)"

# Create necessary directories
echo ""
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p prisma
mkdir -p ssl

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install

# Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
pnpm prisma generate

# Run migrations
echo ""
echo "🗃️  Running database migrations..."
pnpm prisma migrate deploy

# Seed database
echo ""
echo "🌱 Seeding database..."
pnpm prisma db seed

# Generate SSL certificate
echo ""
echo "🔐 Generating SSL certificate..."
if command -v openssl &> /dev/null; then
    openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/CN=yoyopod.local" -batch
    echo "✓ SSL certificate generated"
else
    echo "⚠️  OpenSSL not found. Skipping SSL certificate generation."
    echo "   You can generate it manually later."
fi

# Create .env file if it doesn't exist
echo ""
echo "⚙️  Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created .env file from .env.example"
    echo "⚠️  Please update .env with your configuration"
else
    echo "✓ .env file already exists"
fi

# Build application
echo ""
echo "🏗️  Building application..."
pnpm build

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Run './scripts/start.sh' to start the dashboard"
echo "3. Access the dashboard at https://localhost:3000"
echo ""

