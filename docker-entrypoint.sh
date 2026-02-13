#!/bin/sh
set -e

echo "🚀 Starting Retailer Comparison Backend..."

# Construct DATABASE_URL from individual variables if not already set
if [ -z "$DATABASE_URL" ]; then
  # URL encode function for password (handles special characters)
  urlencode() {
    local string="${1}"
    local strlen=${#string}
    local encoded=""
    local pos c o

    for (( pos=0 ; pos<strlen ; pos++ )); do
      c=${string:$pos:1}
      case "$c" in
        [-_.~a-zA-Z0-9] ) o="${c}" ;;
        * ) printf -v o '%%%02x' "'$c"
      esac
      encoded+="${o}"
    done
    echo "${encoded}"
  }

  # Get individual components with defaults
  POSTGRES_USER=${POSTGRES_USER:-postgres}
  POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
  POSTGRES_DB=${POSTGRES_DB:-retailer_comparison}
  POSTGRES_HOST=${POSTGRES_HOST:-postgres}
  POSTGRES_PORT=${POSTGRES_PORT:-5432}

  # URL encode the password to handle special characters
  ENCODED_PASSWORD=$(urlencode "$POSTGRES_PASSWORD")

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

