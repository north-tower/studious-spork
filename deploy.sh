#!/bin/bash

# Deployment script for Retailer Comparison Backend
# Usage: ./deploy.sh [environment]
# Example: ./deploy.sh production

set -e

ENVIRONMENT=${1:-production}

echo "🚀 Starting deployment for environment: $ENVIRONMENT"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "📝 Please create .env file from .env.example"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed!"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed!"
    exit 1
fi

echo "📦 Building and starting containers..."

# Build and start containers
if [ "$ENVIRONMENT" = "production" ]; then
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
else
    docker compose up -d --build
fi

echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if containers are running
if docker compose ps | grep -q "Up"; then
    echo "✅ Containers are running!"
else
    echo "❌ Error: Containers failed to start!"
    echo "📋 Checking logs..."
    docker compose logs --tail=50
    exit 1
fi

# Check health endpoint
echo "🏥 Checking health endpoint..."
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Health check passed!"
else
    echo "⚠️  Warning: Health check failed, but containers are running"
    echo "📋 Check logs with: docker compose logs -f backend"
fi

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📊 Container status:"
docker compose ps
echo ""
echo "📋 Useful commands:"
echo "  View logs:        docker compose logs -f"
echo "  Stop services:    docker compose down"
echo "  Restart services: docker compose restart"
echo "  View backend logs: docker compose logs -f backend"
echo ""

