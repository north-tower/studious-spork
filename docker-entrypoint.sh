#!/bin/sh
set -e

echo "🚀 Starting Retailer Comparison Backend..."

# Construct DATABASE_URL from individual variables if not already set
if [ -z "$DATABASE_URL" ]; then
  # Get individual components with defaults
  POSTGRES_USER=${POSTGRES_USER:-postgres}
  POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
  POSTGRES_DB=${POSTGRES_DB:-retailer_comparison}
  POSTGRES_HOST=${POSTGRES_HOST:-postgres}
  POSTGRES_PORT=${POSTGRES_PORT:-5432}

  # URL encode the password using Node.js (handles special characters)
  ENCODED_PASSWORD=$(node -e "process.stdout.write(encodeURIComponent(process.argv[1]))" "$POSTGRES_PASSWORD")

  # Construct DATABASE_URL
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${ENCODED_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"
  
  echo "📝 Constructed DATABASE_URL from environment variables"
else
  echo "📝 Using provided DATABASE_URL"
fi

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
