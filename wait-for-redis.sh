#!/bin/sh
# Wait for Redis to be available
until nc -z redis 6379; do
  echo "Waiting for Redis..."
  sleep 1
done
echo "Redis is up - starting n8n worker"
exec n8n worker