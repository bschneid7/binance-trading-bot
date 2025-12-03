#!/bin/bash

# Binance Multi-Strategy Trading Bot - Deployment Script (WebSocket Edition)
# Usage: ./deploy.sh <VPS_IP>

set -e

VPS_IP="${1:-209.38.153.21}"
VPS_USER="root"
DEPLOY_DIR="/opt/trading-bot-multi-strategy"

echo "=================================================="
echo "🚀 Deploying Multi-Strategy Trading Bot to VPS"
echo "   (WebSocket Edition v2.1)"
echo "=================================================="
echo "Target: $VPS_USER@$VPS_IP"
echo "Directory: $DEPLOY_DIR"
echo ""

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf trading-bot-deploy.tar.gz \
  bot.js \
  config.js \
  package.json \
  ecosystem.config.js \
  README.md \
  STRATEGIES.md

echo "✅ Package created: trading-bot-deploy.tar.gz"
echo ""

# Transfer to VPS
echo "📤 Transferring to VPS..."
scp trading-bot-deploy.tar.gz $VPS_USER@$VPS_IP:/tmp/

echo "✅ Transfer complete"
echo ""

# Deploy on VPS
echo "🔧 Deploying on VPS..."
ssh $VPS_USER@$VPS_IP << 'ENDSSH'
set -e

# Stop existing bot if running
echo "Stopping existing bot..."
pm2 stop trading-bot 2>/dev/null || true
pm2 delete trading-bot 2>/dev/null || true

# Backup existing installation
if [ -d "/opt/trading-bot-multi-strategy" ]; then
  echo "Backing up existing installation..."
  BACKUP_NAME="trading-bot-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
  tar -czf "/opt/$BACKUP_NAME" -C /opt trading-bot-multi-strategy
  echo "Backup saved: /opt/$BACKUP_NAME"
fi

# Create deployment directory
echo "Creating deployment directory..."
mkdir -p /opt/trading-bot-multi-strategy
mkdir -p /opt/trading-bot-multi-strategy/logs

# Extract new version
echo "Extracting new version..."
cd /opt/trading-bot-multi-strategy
tar -xzf /tmp/trading-bot-deploy.tar.gz

# Install dependencies (ws package for WebSocket)
echo "Installing dependencies..."
npm install --production

# Make bot executable
chmod +x bot.js

# Start bot with PM2
echo "Starting bot with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup (if not already done)
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "=================================================="
echo "✅ Deployment Complete!"
echo "=================================================="
echo ""
echo "Bot Status:"
pm2 status trading-bot
echo ""
echo "View logs:"
echo "  pm2 logs trading-bot"
echo ""
echo "Monitor bot:"
echo "  pm2 monit"
echo ""
ENDSSH

echo "=================================================="
echo "🎉 Deployment Successful!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. SSH to VPS: ssh $VPS_USER@$VPS_IP"
echo "2. Check logs: pm2 logs trading-bot"
echo "3. Monitor dashboard: http://$VPS_IP:3001"
echo ""
echo "WebSocket connections will be established automatically!"
echo ""
