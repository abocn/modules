#!/bin/sh

set -e

echo "Starting modules app..."

echo "Waiting for database to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if pg_isready -h postgres -p 5432 -U postgres >/dev/null 2>&1; then
    echo "Database is ready!"
    break
  else
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
      echo "Failed to connect to database after $MAX_RETRIES attempts"
      exit 1
    fi
    echo "Database not ready yet... (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
  fi
done

echo "Running database migrations..."
bunx drizzle-kit push

echo "Creating system user..."
bun run scripts/create-system-user.ts

if [ "$RELEASE_SCHEDULE_ENABLED" = "true" ]; then
  echo "Starting job scheduler in background..."
  bun run scripts/start-scheduler.ts &
  SCHEDULER_PID=$!
  echo "Job scheduler started with PID: $SCHEDULER_PID"
fi

trap 'echo "Shutting down..."; kill $SCHEDULER_PID 2>/dev/null || true; exit 0' TERM INT

echo "Starting Next.js server..."
exec bun server.js