#!/bin/bash

# Script to check PostgreSQL container credentials

echo "=== Checking PostgreSQL Container Credentials ==="
echo ""

# Check if container is running
if ! docker ps | grep -q retailer-comparison-db; then
    echo "❌ PostgreSQL container is not running!"
    exit 1
fi

echo "📋 PostgreSQL Container Environment Variables:"
echo "-----------------------------------------------"
docker exec retailer-comparison-db env | grep POSTGRES

echo ""
echo "📝 Recommended DATABASE_URL format:"
echo "-----------------------------------------------"
POSTGRES_USER=$(docker exec retailer-comparison-db printenv POSTGRES_USER)
POSTGRES_PASSWORD=$(docker exec retailer-comparison-db printenv POSTGRES_PASSWORD)
POSTGRES_DB=$(docker exec retailer-comparison-db printenv POSTGRES_DB)

echo "DATABASE_URL=postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@postgres:5432/${POSTGRES_DB:-retailer_comparison}?schema=public"

echo ""
echo "💡 Add this to your .env file"

