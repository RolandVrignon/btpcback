#!/bin/sh
set -e

# Display startup information
echo "Démarrage du conteneur..."
echo "YIIIIIIIHA"
echo "Here we are"

# Debug : Afficher le PATH et le résultat de 'which sed'
echo "PATH: $PATH"
echo "Chemin de sed: $(which sed)"

# Check if DATABASE_URL is defined
if [ -z "$DATABASE_URL" ]; then
  echo "ERREUR: La variable DATABASE_URL n'est pas définie!"
  exit 1
fi

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
host=$(echo $DATABASE_URL | sed -n 's/.*@\(.*\):.*/\1/p')
port=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
echo "Checking connection to PostgreSQL at $host:$port..."

timeout=60
counter=0
until nc -z $host $port
do
    counter=$((counter+1))
    if [ $counter -gt $timeout ]; then
        echo "Timeout waiting for PostgreSQL after ${timeout} seconds"
        exit 1
    fi
    echo "Waiting for PostgreSQL... ($counter seconds)"
    sleep 1
done
echo "PostgreSQL is ready!"

# Generate Prisma client with runtime DATABASE_URL
echo "Generating Prisma client..."
npx prisma generate

# Run Prisma migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy

# Reset database with prisma migrate reset
if [ "$DB_INIT" = "true" ]; then
    echo "Resetting database with prisma migrate reset..."
    pnpm prisma migrate reset --force
    npx prisma db seed
fi

# Debug: Show what command will be executed
echo "Command to be executed: $@"

# Start the application
echo "Starting the application..."

echo "Démarrage de l'application..."
exec node dist/src/main