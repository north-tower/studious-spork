#!/bin/sh
set -e

echo "🚀 Starting Retailer Comparison Backend..."

# Wait for database to be ready (docker-compose handles this with depends_on, but add extra wait)
echo "⏳ Waiting for database to be ready..."
sleep 3

# Run migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy || {
  echo "⚠️  Migration failed, but continuing..."
}

echo "🎉 Starting server..."

# Start the application
exec node dist/server.js

