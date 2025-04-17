#!/bin/sh
set -e

# Display startup information
echo "Démarrage du conteneur..."

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

# Affiche le contenu du dossier /app/public/chat
echo "Contenu du dossier /app/public/chat:"
ls -la /app/public/chat

# Vérifier les chemins possibles du point d'entrée
echo "Recherche du point d'entrée de l'application..."

# Version compatible avec sh au lieu de bash
ENTRY_FOUND=false

# Vérifier chaque chemin possible un par un
if [ -f "dist/src/main.js" ]; then
  echo "Point d'entrée trouvé: dist/src/main.js"
  ENTRY_PATH="dist/src/main.js"
  ENTRY_FOUND=true
elif [ -f "dist/src/main" ]; then
  echo "Point d'entrée trouvé: dist/src/main"
  ENTRY_PATH="dist/src/main"
  ENTRY_FOUND=true
elif [ -f "dist/main.js" ]; then
  echo "Point d'entrée trouvé: dist/main.js"
  ENTRY_PATH="dist/main.js"
  ENTRY_FOUND=true
elif [ -f "dist/main" ]; then
  echo "Point d'entrée trouvé: dist/main"
  ENTRY_PATH="dist/main"
  ENTRY_FOUND=true
else
  echo "Aucun point d'entrée standard trouvé."
fi

if [ "$ENTRY_FOUND" = false ]; then
  echo "ERREUR: Aucun point d'entrée trouvé!"
  echo "Contenu du répertoire dist:"
  find dist -type f -name "*.js" | sort

  # Recherche automatique d'un point d'entrée
  MAIN_FILE=$(find dist -type f -name "main.js" | head -1)
  if [ -n "$MAIN_FILE" ]; then
    echo "Point d'entrée alternatif trouvé: $MAIN_FILE"
    ENTRY_PATH="$MAIN_FILE"
    ENTRY_FOUND=true
  else
    exit 1
  fi
fi

# Debug: Show what command will be executed
echo "Command to be executed: node $ENTRY_PATH"

# Start the application
echo "Starting the application..."

echo "Démarrage de l'application..."
exec node "$ENTRY_PATH"